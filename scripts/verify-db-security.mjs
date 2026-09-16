/**
 * Database security + integrity checks against a DISPOSABLE local database.
 *
 *   node scripts/verify-db-security.mjs
 *
 * Builds a fresh Supabase-shaped Postgres in memory (scripts/db/supabaseStub.mjs),
 * applies every migration in the documented bootstrap order, creates synthetic
 * users A, B and an admin, and then asserts — as each real role — what the
 * 2026-09-15 audit said must and must not be possible:
 *
 *   M01  every migration applies to a fresh database in bootstrap order
 *   H01  a user cannot write their own quota counters; reservations are atomic
 *   H02  a user can edit package metadata but not payment/generated fields
 *   H04  concurrent service writes both survive; mock runs follow their lifecycle
 *   H08  profile save is all-or-nothing and refuses a stale version
 *   M02  the photo bucket carries size/type limits; owner-folder policy holds
 *   L02  function search paths pinned; trigger function not callable
 *   H07  expired anonymous CV sessions are purged, live ones are kept
 *   M07  saved / rejected / withdrawn stages exist and are user-settable
 *
 * No network, no credentials, no production access. Never point at a real DB.
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  createSupabaseLikeDb,
  applyMigrations,
  bootstrapOrder,
  migrationFiles,
  asUser,
  asService,
  asAnon,
  createAuthUser,
} from './db/supabaseStub.mjs'

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')

let failures = 0
let passes = 0
function check(name, cond, detail = '') {
  if (cond) {
    passes++
    console.log(`  PASS  ${name}`)
  } else {
    failures++
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`)
  }
}
async function denied(fn) {
  try {
    await fn()
    return false
  } catch (e) {
    return /permission denied|violates row-level security|not authenticated/i.test(e.message)
  }
}
async function throws(fn) {
  try {
    await fn()
    return false
  } catch {
    return true
  }
}

// ---------------------------------------------------------------------------
console.log('\nM01 · fresh-database bootstrap')
{
  const naive = await createSupabaseLikeDb()
  const failedNaive = await throws(() => applyMigrations(naive, MIGRATIONS, migrationFiles(MIGRATIONS)))
  check('plain numeric order fails on a fresh database (the documented prerequisite is real)', failedNaive)
  await naive.close()
}
const db = await createSupabaseLikeDb()
const order = await applyMigrations(db, MIGRATIONS)
check(`all ${order.length} migrations apply in bootstrap order`, order.length === migrationFiles(MIGRATIONS).length)
check('020 is applied before 013', order.indexOf('020_profiles_base.sql') < order.indexOf('013_operations.sql'))
check('bootstrapOrder is deterministic', JSON.stringify(bootstrapOrder(MIGRATIONS)) === JSON.stringify(order))

const A = await createAuthUser(db, 'a@example.test')
const B = await createAuthUser(db, 'b@example.test')
const ADMIN = await createAuthUser(db, 'admin@example.test')
await db.query('update public.profiles set is_admin = true where user_id = $1', [ADMIN])
check('sign-up trigger still creates a profiles row', (await db.query('select count(*)::int n from public.profiles')).rows[0].n === 3)

// ---------------------------------------------------------------------------
console.log('\nH01 · quota state is server-owned')
const today = (await db.query("select current_date::text d")).rows[0].d
await asService(db, () =>
  db.query("insert into public.rate_limits (user_id, action, window_start, count) values ($1, 'optimization', $2, 3)", [A, today]),
)
check('owner can READ own counter', (await asUser(db, A, () => db.query('select count from public.rate_limits'))).rows.length === 1)
check("owner cannot read another user's counter", (await asUser(db, B, () => db.query('select count from public.rate_limits'))).rows.length === 0)
check('owner cannot UPDATE count', await denied(() => asUser(db, A, () => db.query('update public.rate_limits set count = 0'))))
check('owner cannot set limit_override', await denied(() => asUser(db, A, () => db.query('update public.rate_limits set limit_override = 9999'))))
check('owner cannot INSERT a counter row', await denied(() =>
  asUser(db, A, () => db.query("insert into public.rate_limits (user_id, action, window_start, count) values ($1, 'cover_letter', $2, 0)", [A, today])),
))
check('owner cannot DELETE a counter row', await denied(() => asUser(db, A, () => db.query('delete from public.rate_limits'))))
check('anon cannot read counters', await denied(() => asAnon(db, () => db.query('select * from public.rate_limits'))))
check('user cannot call reserve_rate_limit', await denied(() =>
  asUser(db, A, () => db.query("select * from public.reserve_rate_limit($1, 'x', current_date, '{}', 100, null, 5, 60)", [A])),
))
check('user cannot call consume_rate_limit_reservation', await denied(() =>
  asUser(db, A, () => db.query('select public.consume_rate_limit_reservation(gen_random_uuid())')),
))
check('user cannot read reservations', await denied(() => asUser(db, A, () => db.query('select * from public.rate_limit_reservations'))))
check('user cannot read service controls', await denied(() => asUser(db, A, () => db.query('select * from public.ai_service_controls'))))
check('user cannot change service controls', await denied(() => asUser(db, A, () => db.query('update public.ai_service_controls set enabled = true'))))

const reserve = (uid, action, limit, maxConc = 5, globalLimit = null, ids = []) =>
  asService(db, () =>
    db.query('select * from public.reserve_rate_limit($1, $2, current_date, $3::uuid[], $4, $5, $6, 360)', [uid, action, ids, limit, globalLimit, maxConc]),
  ).then((r) => r.rows[0])

{
  const r1 = await reserve(A, 'interview_qa', 2)
  const r2 = await reserve(A, 'interview_qa', 2)
  const r3 = await reserve(A, 'interview_qa', 2)
  check('reservations up to the limit succeed', r1.status === 'reserved' && r2.status === 'reserved')
  check('pending reservations count toward the limit (no concurrent overshoot)', r3.status === 'limit')
  const consumed = await asService(db, () => db.query('select public.consume_rate_limit_reservation($1) ok', [r1.reservation_id]))
  const again = await asService(db, () => db.query('select public.consume_rate_limit_reservation($1) ok', [r1.reservation_id]))
  check('consume counts one use', consumed.rows[0].ok === true)
  check('consume is idempotent', again.rows[0].ok === false)
  await asService(db, () => db.query('select public.release_rate_limit_reservation($1)', [r2.reservation_id]))
  const r4 = await reserve(A, 'interview_qa', 2)
  check('a released (failed) attempt gives its slot back', r4.status === 'reserved' && r4.used === 1)
  const n = (await db.query("select count from public.rate_limits where user_id = $1 and action = 'interview_qa'", [A])).rows[0]?.count
  check('only consumed attempts are counted', n === 1)
}
{
  const c1 = await reserve(B, 'mock_interview_answer', 50, 1)
  const c2 = await reserve(B, 'mock_interview_answer', 50, 1)
  check('concurrency cap: a second in-flight request is refused as busy', c1.status === 'reserved' && c2.status === 'busy')
  await db.query("update public.rate_limit_reservations set expires_at = now() - interval '1 second' where id = $1", [c1.reservation_id])
  const c3 = await reserve(B, 'mock_interview_answer', 50, 1)
  check('an expired reservation (killed function) stops blocking', c3.status === 'reserved')
}
{
  const g1 = await reserve(A, 'cover_letter', 10, 5, 1)
  const g2 = await reserve(B, 'cover_letter', 10, 5, 1)
  check('global daily cap applies across users', g1.status === 'reserved' && g2.status === 'global_limit')
}
{
  await asService(db, () =>
    db.query("insert into public.rate_limits (user_id, action, window_start, count) values ($1, 'profile_extraction', current_date, 5)", [A]),
  )
  const shared = await reserve(B, 'profile_extraction', 5, 5, null, [A])
  check('secondary identity keying: usage on a linked account counts', shared.status === 'limit')
}

console.log('\nM14 · founder usage counters (counted where limits are enforced)')
{
  const stat = async (action) =>
    (await asService(db, () => db.query('select * from public.ai_service_daily_stats where action = $1 and day = current_date', [action]))).rows[0] ?? {}
  const qa = await stat('interview_qa')
  check('interview_qa: 3 allowed, 1 saved, 1 failed, 1 refused at the limit',
    qa.reserved === 3 && qa.succeeded === 1 && qa.failed === 1 && qa.refused_limit === 1, JSON.stringify(qa))
  const ans = await stat('mock_interview_answer')
  check('mock answers: a busy refusal is counted', ans.reserved === 2 && ans.refused_busy === 1, JSON.stringify(ans))
  const cl = await stat('cover_letter')
  check('cover letters: the all-users cap refusal is counted', cl.refused_global === 1, JSON.stringify(cl))
  const cols = (await db.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'ai_service_daily_stats'")).rows.map((r) => r.column_name)
  check('the counters hold no user id or content', !cols.includes('user_id') && cols.length === 8)
  check('users cannot read the counters', await denied(() => asUser(db, A, () => db.query('select * from public.ai_service_daily_stats'))))
  check('nobody but the enforcing functions can bump a counter', await denied(() =>
    asService(db, () => db.query("select public.bump_ai_service_stat('x', current_date, 'reserved')")),
  ))
  check('users cannot read the change history', await denied(() => asUser(db, ADMIN, () => db.query('select * from public.ai_service_control_changes'))))
  check('the change history is append-only for the server', await denied(() =>
    asService(db, () => db.query("update public.ai_service_control_changes set action = 'x'")),
  ))
}

// ---------------------------------------------------------------------------
console.log('\nH08 · atomic profile save')
const save = (uid, profile, children, expected = null) =>
  asUser(db, uid, () => db.query('select public.save_career_profile($1::jsonb, $2::jsonb, $3) r', [profile, children, expected])).then((r) => r.rows[0].r)

const baseProfile = { full_name: 'Test A', phone: '+971500000000', email: 'a@example.test', currently_in_gulf: false, visa_transferable: null }
const s1 = await save(A, baseProfile, {
  work_experience: [
    { company: 'Acme', role: 'Engineer', start_date: '2019-01-01', end_date: null, sort_order: 0, highlights: ['Led 4 engineers'] },
    { company: 'Beta', role: 'Designer', start_date: '2016-01-01', end_date: '2018-12-01', sort_order: 1 },
  ],
  skills: [{ name: 'AutoCAD', sort_order: 0 }],
  certifications: [],
  education: [{ degree: 'B.Tech', institution: '', sort_order: 0, end_year: 2015 }],
  additional_information: [],
})
check('first save creates the profile', s1.status === 'saved' && !!s1.profile_id)
const profileId = s1.profile_id
const work = (await db.query('select id, company, highlights from public.profile_work_experience where profile_id = $1 order by sort_order', [profileId])).rows
check('children inserted with generated ids', work.length === 2 && work.every((w) => w.id))
check('text[] highlights survive the JSON round trip', Array.isArray(work[0].highlights) && work[0].highlights[0] === 'Led 4 engineers')
check('visa_transferable stays NULL when not stated', (await db.query('select visa_transferable from public.career_profiles where id = $1', [profileId])).rows[0].visa_transferable === null)

const s2 = await save(A, { ...baseProfile, full_name: 'Test A2' }, {
  work_experience: [{ id: work[0].id, company: 'Acme Corp', role: 'Engineer', start_date: '2019-01-01', sort_order: 0 }],
}, s1.updated_at)
const work2 = (await db.query('select id, company from public.profile_work_experience where profile_id = $1', [profileId])).rows
check('upsert-by-id keeps the row id', s2.status === 'saved' && work2.length === 1 && work2[0].id === work[0].id && work2[0].company === 'Acme Corp')
check('a collection that is not sent is left untouched', (await db.query('select count(*)::int n from public.profile_skills where profile_id = $1', [profileId])).rows[0].n === 1)

const stale = await save(A, { ...baseProfile, full_name: 'Stale tab' }, {}, s1.updated_at)
check('a stale version is refused as conflict', stale.status === 'conflict')
check('a refused save writes nothing', (await db.query('select full_name from public.career_profiles where id = $1', [profileId])).rows[0].full_name === 'Test A2')

const beforeFail = (await db.query('select full_name, updated_at::text u from public.career_profiles where id = $1', [profileId])).rows[0]
const failed = await throws(() =>
  save(A, { ...baseProfile, full_name: 'Half written' }, {
    skills: [{ name: 'New skill', sort_order: 0 }],
    work_experience: [{ company: null, role: 'Broken', start_date: '2020-01-01', sort_order: 0 }],
  }),
)
const afterFail = (await db.query('select full_name, updated_at::text u from public.career_profiles where id = $1', [profileId])).rows[0]
const skillsAfterFail = (await db.query('select name from public.profile_skills where profile_id = $1', [profileId])).rows
check('a failure in a child table rejects the whole save', failed)
check('…and the parent row is unchanged (no partial commit)', afterFail.full_name === beforeFail.full_name && afterFail.u === beforeFail.u)
check('…and earlier child tables in the same save are rolled back', skillsAfterFail.length === 1 && skillsAfterFail[0].name === 'AutoCAD')

const sB = await save(B, { full_name: 'Test B', phone: '+971511111111', email: 'b@example.test', currently_in_gulf: true }, {
  skills: [{ name: 'Excel', sort_order: 0 }],
})
const bSkill = (await db.query('select id from public.profile_skills where profile_id = $1', [sB.profile_id])).rows[0].id
const hijack = await throws(() => save(A, baseProfile, { skills: [{ id: bSkill, name: 'Stolen', sort_order: 0 }] }))
check("a user cannot overwrite another user's child row by id", hijack)
check("…and B's row is intact", (await db.query('select name from public.profile_skills where id = $1', [bSkill])).rows[0].name === 'Excel')
check('anon cannot call save_career_profile', await denied(() => asAnon(db, () => db.query("select public.save_career_profile('{}'::jsonb, '{}'::jsonb)"))))

// ---------------------------------------------------------------------------
console.log('\nH02 · package field integrity')
const insertPkg = (uid, pid) =>
  asService(db, () =>
    db.query(
      `insert into public.packages (user_id, profile_id, target_job_title, target_country, target_industry, optimization_level,
         optimized_content, skills_order, field_visibility_snapshot, status)
       values ($1, $2, 'Piping Engineer', 'uae', 'Oil & Gas', 'moderate', '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, 'saved') returning id`,
      [uid, pid],
    ),
  ).then((r) => r.rows[0].id)
const pkgA = await insertPkg(A, profileId)
const pkgB = await insertPkg(B, sB.profile_id)

check('owner can rename a package', (await asUser(db, A, () => db.query("update public.packages set name = 'My Aramco CV' where id = $1", [pkgA]))).affectedRows === 1)
check('owner can change the application stage', (await asUser(db, A, () => db.query("update public.packages set status = 'interview' where id = $1", [pkgA]))).affectedRows === 1)
check('owner can edit tracker fields', (await asUser(db, A, () =>
  db.query("update public.packages set job_url = 'https://jobs.example/1', application_notes = 'called HR', application_deadline = current_date where id = $1", [pkgA]),
)).affectedRows === 1)
for (const [col, val] of [
  ['is_paid', 'true'],
  ['payment_id', "'fake'"],
  ['optimized_content', "'{\"summary\":\"invented\"}'::jsonb"],
  ['document_snapshot', "'{}'::jsonb"],
  ['profile_id', `'${sB.profile_id}'::uuid`],
  ['cover_letters', "'{}'::jsonb[]"],
  ['interview_questions', "'{}'::jsonb"],
  ['mock_interview_runs', "'{}'::jsonb[]"],
  ['service_events', "'{}'::jsonb[]"],
  ['user_id', `'${B}'::uuid`],
]) {
  check(`owner cannot write ${col}`, await denied(() => asUser(db, A, () => db.query(`update public.packages set ${col} = ${val} where id = $1`, [pkgA]))))
}
check('owner cannot INSERT a package directly', await denied(() =>
  asUser(db, A, () =>
    db.query(
      `insert into public.packages (user_id, profile_id, target_job_title, target_country, target_industry, optimization_level, optimized_content, skills_order, field_visibility_snapshot, is_paid)
       values ($1, $2, 'x', 'uae', 'x', 'moderate', '{}', '[]', '{}', true)`,
      [A, profileId],
    ),
  ),
))
check("a user's metadata update cannot reach another user's package", (await asUser(db, A, () => db.query("update public.packages set name = 'x' where id = $1", [pkgB]))).affectedRows === 0)
check("a user cannot read another user's package", (await asUser(db, A, () => db.query('select id from public.packages where id = $1', [pkgB]))).rows.length === 0)
check('anon cannot read packages', await denied(() => asAnon(db, () => db.query('select id from public.packages'))))
check('user cannot call the privileged package writers', await denied(() =>
  asUser(db, A, () => db.query("select public.package_append_event($1, $2, '{}'::jsonb)", [pkgA, A])),
))

// ---------------------------------------------------------------------------
console.log('\nH04 · concurrent service writes')
const ev = (type) => JSON.stringify({ id: crypto.randomUUID(), type, at: new Date().toISOString(), label: type })
const svc = (sql, params) => asService(db, () => db.query(sql, params))

// Interleaving that lost data before: writer 1 reads the row, writer 2 saves a
// letter, writer 1 then records its own event. Both must survive.
const staleRead = (await svc('select service_events from public.packages where id = $1', [pkgA])).rows[0].service_events
await svc("select public.package_append_cover_letter($1, $2, $3::jsonb, $4::jsonb)", [pkgA, A, JSON.stringify({ id: 'L1', body: 'letter one' }), ev('cover_letter_generated')])
await svc('select public.package_append_event($1, $2, $3::jsonb)', [pkgA, A, ev('pdf_downloaded')])
await svc("select public.package_append_cover_letter($1, $2, $3::jsonb, $4::jsonb)", [pkgA, A, JSON.stringify({ id: 'L2', body: 'letter two' }), ev('cover_letter_generated')])
const afterWrites = (await svc('select cover_letters, service_events from public.packages where id = $1', [pkgA])).rows[0]
check('two letters saved back-to-back both survive', afterWrites.cover_letters.length === 2)
check('events written after a stale read are not lost', afterWrites.service_events.length === (staleRead?.length ?? 0) + 3)
await svc('select public.package_append_event($1, $2, $3::jsonb, 600)', [pkgA, A, ev('pdf_downloaded')])
check('a repeated PDF download inside the dedupe window adds no event',
  (await svc('select array_length(service_events, 1) n from public.packages where id = $1', [pkgA])).rows[0].n === afterWrites.service_events.length)
check('privileged writers refuse the wrong owner', (await svc('select public.package_append_event($1, $2, $3::jsonb) ok', [pkgA, B, ev('x')])).rows[0].ok === false)

console.log('\nM05 · mock interview lifecycle')
const run = {
  id: 'run-1', status: 'in_progress', current_index: 0, completed_at: null, final_report: null,
  questions: [
    { id: 'q1', question: 'Q1', answer: null },
    { id: 'q2', question: 'Q2', answer: null },
  ],
}
await svc('select public.package_append_mock_run($1, $2, $3::jsonb, $4::jsonb)', [pkgA, A, JSON.stringify(run), ev('mock_interview_started')])
const rec = (qid, text) =>
  svc('select public.package_record_mock_answer($1, $2, $3, $4, $5::jsonb, $6::jsonb) r', [
    pkgA, A, 'run-1', qid, JSON.stringify({ answer: text, score: 70, answered_at: new Date().toISOString() }), ev('mock_interview_answered'),
  ]).then((r) => r.rows[0].r)
const finish = (report) =>
  svc('select public.package_complete_mock_run($1, $2, $3, $4::jsonb, $5::jsonb) r', [pkgA, A, 'run-1', JSON.stringify(report), ev('mock_interview_completed')]).then((r) => r.rows[0].r)

const noAns = await finish({ overall_score: 1 })
check('finishing with no answers is refused', noAns.status === 'no_answers')
const a1 = await rec('q1', 'first answer')
check('an answer is saved', a1.status === 'saved' && a1.run.questions[0].answer === 'first answer')
check('current_index advances', a1.run.current_index === 1)
const a1dup = await rec('q1', 'overwrite attempt')
check('a second answer to the same question is refused (no double charge)', a1dup.status === 'already_answered')
check('…and the first answer is kept', a1dup.run.questions[0].answer === 'first answer')
check('an unknown question is reported', (await rec('nope', 'x')).status === 'question_not_found')
const f1 = await finish({ overall_score: 72 })
check('finish completes the run', f1.status === 'completed' && f1.run.final_report.overall_score === 72)
const f2 = await finish({ overall_score: 10 })
check('a repeated finish returns the saved report unchanged', f2.status === 'already_completed' && f2.run.final_report.overall_score === 72)
check('answers are refused once a run is completed', (await rec('q2', 'late')).status === 'run_not_in_progress')

// ---------------------------------------------------------------------------
console.log('\nM08 · lightweight, paged, server-searched job list')
{
  await svc("select public.package_set_interview_questions($1, $2, $3::jsonb, $4::jsonb)", [
    pkgA, A, JSON.stringify({ id: 'qa1', question_count: 2, questions: [{ id: 'x' }, { id: 'y' }] }), ev('qa_generated'),
  ])
  // A few more of A's jobs, created in a known order, for paging and search.
  for (const [title, company] of [['Site Engineer', 'Delta EPC'], ['QA/QC Inspector', 'Gulf Refining'], ['Planning Engineer', null]]) {
    await asService(db, () =>
      db.query(
        `insert into public.packages (user_id, profile_id, target_job_title, target_company, target_country, target_industry, optimization_level,
           optimized_content, skills_order, field_visibility_snapshot)
         values ($1, $2, $3, $4, 'saudi_arabia', 'Oil & Gas', 'moderate', null, null, '{}'::jsonb)`,
        [A, profileId, title, company],
      ),
    )
  }
  const list = (args) =>
    asUser(db, A, () =>
      db.query('select * from public.list_package_summaries($1, $2, $3, $4, $5, $6)', [
        args.limit ?? 20, args.before ?? null, args.beforeId ?? null, args.q ?? null, args.stage ?? null, args.resume ?? false,
      ]),
    ).then((r) => r.rows)

  const all = await list({})
  check("a user's list holds only their own jobs", all.length === 4 && !all.some((r) => r.id === pkgB))
  const rowA = all.find((r) => r.id === pkgA)
  check('flags replace documents: letters counted', rowA.cover_letter_count === 2)
  check('flags replace documents: Q&A counted', rowA.qa_question_count === 2)
  check('flags replace documents: finished mock report id', rowA.mock_completed_run_id === 'run-1')
  check('flags replace documents: CV built', rowA.has_resume === true)
  check('no document columns are returned', !('optimized_content' in rowA) && !('cover_letters' in rowA) && !('document_snapshot' in rowA))
  check('new jobs start as "saved" (column default, migration 055)', all.filter((r) => r.id !== pkgA).every((r) => r.status === 'saved'))

  const page1 = await list({ limit: 2 })
  const last = page1[page1.length - 1]
  const page2 = await list({ limit: 2, before: last.created_at, beforeId: last.id })
  check('keyset paging returns the next page without overlap', page1.length === 2 && page2.length === 2 && !page2.some((r) => page1.some((p) => p.id === r.id)))
  check('paging covers every job', new Set([...page1, ...page2].map((r) => r.id)).size === 4)

  check('search matches the role', (await list({ q: 'planning' })).length === 1)
  check('search matches the company', (await list({ q: 'gulf refining' })).length === 1)
  check('search matches the country', (await list({ q: 'saudi' })).length === 3)
  check('search treats % as a literal, not a wildcard', (await list({ q: '%' })).length === 0)
  check('search finds an old job that is not on the first page', (await list({ q: 'Aramco' })).length === 1)
  check('stage filter', (await list({ stage: 'withdrawn' })).length === 0 && (await list({ stage: 'saved' })).length === 3)
  check('only-with-CV filter for service pickers', (await list({ resume: true })).length === 1)
  check("user B sees none of A's jobs", (await asUser(db, B, () => db.query('select * from public.list_package_summaries()'))).rows.every((r) => r.id === pkgB))
  check('anon cannot list', await denied(() => asAnon(db, () => db.query('select * from public.list_package_summaries()'))))
}

// ---------------------------------------------------------------------------
console.log('\nM07 · application stages')
const stages = (await db.query("select array_agg(e.enumlabel::text order by e.enumsortorder) s from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'package_status_enum'")).rows[0].s
check('saved is the first stage', stages[0] === 'saved')
check('rejected and withdrawn exist', stages.includes('rejected') && stages.includes('withdrawn'))
check('existing stages are preserved', ['applied', 'shortlisted', 'interview', 'visa_processing', 'offer'].every((s) => stages.includes(s)))
check('owner can mark an application withdrawn', (await asUser(db, A, () => db.query("update public.packages set status = 'withdrawn' where id = $1", [pkgA]))).affectedRows === 1)

// ---------------------------------------------------------------------------
console.log('\nM02 / L02 · storage and functions')
const bucket = (await db.query("select file_size_limit, allowed_mime_types from storage.buckets where id = 'profile-photos'")).rows[0]
check('photo bucket has a 5 MiB limit', Number(bucket.file_size_limit) === 5242880)
check('photo bucket allows only JPEG/PNG/WebP', JSON.stringify(bucket.allowed_mime_types) === JSON.stringify(['image/jpeg', 'image/png', 'image/webp']))
check("a user cannot upload into another user's folder", await denied(() =>
  asUser(db, A, () => db.query("insert into storage.objects (bucket_id, name) values ('profile-photos', $1)", [`${B}/x.jpg`])),
))
check('a user can upload into their own folder', (await asUser(db, A, () =>
  db.query("insert into storage.objects (bucket_id, name) values ('profile-photos', $1)", [`${A}/me.jpg`]),
)).affectedRows === 1)
const cfg = (await db.query("select proname, proconfig from pg_proc where proname in ('set_updated_at','handle_new_user_profile')")).rows
check('both flagged functions have a pinned search_path', cfg.length === 2 && cfg.every((r) => (r.proconfig ?? []).some((c) => c.startsWith('search_path='))))
check('the sign-up trigger function is not callable by users', await denied(() => asUser(db, A, () => db.query('select public.handle_new_user_profile()'))))

// ---------------------------------------------------------------------------
console.log('\nH07 · retention purge')
await db.query(`insert into public.anonymous_analysis_sessions (token_hash, identity_hash, resume_text, extracted_profile, expires_at) values
  ('t1', 'i1', 'synthetic cv text', '{}'::jsonb, now() - interval '1 day'),
  ('t2', 'i2', 'synthetic cv text', '{}'::jsonb, now() + interval '3 days')`)
check('users cannot run the purge', await denied(() => asUser(db, A, () => db.query('select public.purge_expired_operational_data()'))))
const purge = (await svc('select public.purge_expired_operational_data() r')).rows[0].r
check('expired anonymous sessions are deleted', purge.anonymous_sessions_deleted === 1)
check('unexpired sessions are kept', (await db.query('select count(*)::int n from public.anonymous_analysis_sessions')).rows[0].n === 1)
check('the purge reports counts only', Object.values(purge).every((v) => typeof v === 'number'))
check('users cannot read the maintenance log', await denied(() => asUser(db, ADMIN, () => db.query('select * from public.maintenance_runs'))))

await db.close()
console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
