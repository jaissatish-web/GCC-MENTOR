import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { createSupabaseLikeDb, applyMigrations, asUser, asService, asAnon, createAuthUser } from './db/supabaseStub.mjs'

const db = await createSupabaseLikeDb()
try {
  await applyMigrations(db, new URL('../supabase/migrations/', import.meta.url).pathname)
  const a = await createAuthUser(db, 'dashboard-a@example.test')
  const b = await createAuthUser(db, 'dashboard-b@example.test')
  const c = await createAuthUser(db, 'dashboard-c@example.test')
  const overview = (uid) => asUser(db, uid, async () => (await db.query('select public.dashboard_overview() value')).rows[0].value)
  const empty = await overview(a)
  assert.equal(empty.resume_count, 0)
  assert.equal(empty.target_job_count, 0)
  assert.equal(empty.average_mock_score, null)
  assert.ok(Object.values(empty.stages).every(n => n === 0))
  await assert.rejects(() => asAnon(db, () => db.query('select public.dashboard_overview()')), /permission denied/)
  const saveProfile = (uid) => asUser(db, uid, async () => (await db.query(
    "select public.save_career_profile($1::jsonb, '{}'::jsonb) result",
    [JSON.stringify({ full_name: 'Test profile', phone: '+971500000000', email: 'test@example.test', currently_in_gulf: false })],
  )).rows[0].result.profile_id)
  const pa = await saveProfile(a), pb = await saveProfile(b), pc = await saveProfile(c)
  assert.equal((await overview(a)).resume_count, 1, 'Saved profile offers a CV even before its preference row is opened')
  const insert = (uid, pid, tier = null, optimized = true) => asService(db, async () => (await db.query(
    `insert into public.packages(user_id, profile_id, tier, target_job_title, target_country, target_industry,
      optimization_level, optimized_content, skills_order, field_visibility_snapshot, is_paid)
     values($1,$2,$3,'PRIVATE JOB TITLE','uae','Engineering','moderate',$4::jsonb,'[]','{}',true) returning id`,
    [uid, pid, tier, optimized ? JSON.stringify({ summary: 'PRIVATE RESUME TEXT' }) : null],
  )).rows[0].id)
  const first = await insert(a, pa), second = await insert(a, pa)
  // The aggregate must not truncate at either the dashboard's 50 or API's 100.
  for (let i = 0; i < 128; i++) await insert(a, pa)
  await insert(a, pa, null, false)
  const raw = await insert(a, pa, 'free', true)
  const foreign = await insert(b, pb)
  await insert(c, pc, 'free', false)
  await db.query(`update public.packages set cover_letters = ARRAY['{"text":"PRIVATE LETTER"}'::jsonb,'{}'::jsonb],
    interview_questions = '{"questions":[{"answer":"PRIVATE ANSWER"}]}' where id=$1`, [first])
  await db.query(`update public.packages set cover_letters=ARRAY['{}'::jsonb],
    interview_question_sets=ARRAY['{"questions":[{}]}'::jsonb,'{"questions":[{}]}'::jsonb],
    interview_questions='{"questions":[{}]}'::jsonb, status='interview',
    mock_interview_runs=ARRAY[
      '{"status":"completed","final_report":{"overall_score":60}}'::jsonb,
      '{"status":"completed","final_report":{"overall_score":80}}'::jsonb,
      '{"status":"in_progress","questions":[{"answer":"PRIVATE TRANSCRIPT"}]}'::jsonb,
      '{"status":"completed","final_report":null}'::jsonb,
      '{"status":"completed","final_report":{"overall_score":"broken"}}'::jsonb,
      '{"status":"completed","final_report":{"overall_score":200}}'::jsonb] where id=$1`, [second])
  await db.query("update public.packages set cover_letters=ARRAY['{}'::jsonb], interview_question_sets=ARRAY['{\"questions\":[{}]}'::jsonb] where id=$1", [raw])
  await db.query("update public.packages set cover_letters=ARRAY['{}'::jsonb] where id=$1", [foreign])
  const before = await db.query('select md5(row_to_json(p)::text) hash from public.packages p order by id')
  const result = await overview(a)
  assert.equal(result.resume_count, 131)
  assert.equal(result.profile_resume_count, 1)
  assert.equal(result.optimized_resume_count, 130)
  assert.equal(result.target_job_count, 131)
  assert.equal(result.draft_resume_count, 1)
  assert.equal(result.cover_letter_count, 4)
  assert.equal(result.qa_set_count, 4, 'Legacy latest set counts once; modern latest is not double-counted')
  assert.equal(result.mock_interview_count, 6)
  assert.equal(result.mock_completed_count, 4, 'Only completed runs with saved reports count as completed')
  assert.equal(result.mock_in_progress_count, 1)
  assert.equal(result.average_mock_score, 70, 'Ignore malformed, missing and out-of-range scores')
  assert.equal(result.resumes_with_letter, 3)
  assert.equal(result.resumes_with_qa, 3)
  assert.equal(result.resumes_with_mock, 1)
  assert.equal(result.stages.interview, 1)
  assert.equal(result.stages.saved, 130, 'Raw CV is excluded from application stages')
  assert.equal((await overview(b)).cover_letter_count, 1)
  assert.equal((await overview(c)).resume_count, 1, 'Profile-only user needs no optimized CV')
  assert.equal((await overview(c)).optimized_resume_count, 0)
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false)
  assert.deepEqual((await db.query('select md5(row_to_json(p)::text) hash from public.packages p order by id')).rows, before.rows, 'Dashboard reads never alter any package')
  const security = (await db.query("select prosecdef from pg_proc where oid='public.dashboard_overview()'::regprocedure")).rows[0]
  assert.equal(security.prosecdef, false)
  await db.exec('drop function public.dashboard_overview()')
  await db.exec(readFileSync(new URL('../supabase/migrations/066_dashboard_overview.sql', import.meta.url), 'utf8'))
  assert.deepEqual(await overview(a), result, 'Drop/reapply preserves underlying data and counts')
  console.log('PASS: whole-account counts, legacy artifacts, profile-only/new users, read-only data, owner isolation and reversible migration')
} finally { await db.close() }

const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
let user = null, failed = false, rpcCalls = 0
const id = require.resolve('../lib/supabase/server.ts')
require.cache[id] = { id, filename: id, loaded: true, exports: { createClient: async () => ({
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  rpc: async (name, args) => { rpcCalls++; assert.equal(name, 'dashboard_overview'); assert.equal(args, undefined); return { data: failed ? null : { resume_count: 1 }, error: failed ? new Error('offline') : null } },
}) } }
const { GET } = require('../app/api/dashboard/overview/route.ts')
assert.equal((await GET()).status, 401)
assert.equal(rpcCalls, 0)
user = { id: 'owner' }
const response = await GET()
assert.equal(response.status, 200)
assert.equal(response.headers.get('cache-control'), 'private, no-store')
assert.deepEqual(await response.json(), { resume_count: 1 })
failed = true
assert.equal((await GET()).status, 503)
console.log('PASS: API authentication, owner-derived RPC, private uncached response and safe failure')
