import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { applyMigrations, asService, asUser, createAuthUser, createSupabaseLikeDb } from './db/supabaseStub.mjs'

const db = await createSupabaseLikeDb()
try {
  await applyMigrations(db, 'supabase/migrations')
  const admin = await createAuthUser(db, 'admin@example.test')
  const referrer = await createAuthUser(db, 'referrer@example.test')
  await db.query('update public.profiles set is_admin = true where user_id = $1', [admin])
  await db.exec('update public.referral_program_settings set enabled = true; update public.credit_wallet_settings set enforcement_enabled = true')
  const service = async (sql, values) => (await asService(db, () => db.query(sql, values))).rows[0]
  const { code } = await service('select (public.get_or_create_referral_link($1)).code', [referrer])
  const browser = randomUUID()
  const { claim_id: claim } = await service('select * from public.record_referral_visit($1,$2)', [code, browser])
  const register = async email => {
    const { id: intent } = await service('select public.create_referral_signup_intent($1,$2,$3) id', [claim, browser, email])
    return (await db.query('insert into auth.users(email, raw_user_meta_data) values ($1, jsonb_build_object(\'referral_signup_intent\',$2::text)) returning id', [email, intent])).rows[0].id
  }
  const one = await register('one@example.test')
  const two = await register('two@mailinator.com')
  const deletedIdentity = await register('recreated@example.test')
  const qualifies = (id, version, approved = false) =>
    service('select public.qualify_referral($1,$2,$3) status', [id, version, approved])
  async function buildProfile(id, name) {
    const profile = (await db.query("insert into public.career_profiles(user_id, full_name, currently_in_gulf, phone, email) values($1,$2,false,'+10000000000','fixture@example.test') returning id, updated_at", [id, name])).rows[0]
    await db.query('insert into public.profile_skills(profile_id,name,sort_order) values($1,\'Synthetic skill\',0)', [profile.id])
    return profile
  }
  const verify = id => db.query('update auth.users set email_confirmed_at = now() where id = $1', [id])
  const firstProfile = await buildProfile(one, 'Candidate One')
  const version = firstProfile.updated_at
  assert.equal((await qualifies(one, version)).status, 'pending_verification')
  await verify(one)
  assert.equal((await qualifies(one, new Date(0))).status, 'incomplete_profile')
  assert.equal((await qualifies(one, version)).status, 'qualified')
  assert.equal((await qualifies(one, version)).status, 'qualified')

  const secondProfile = await buildProfile(two, 'Candidate Two')
  await verify(two)
  assert.equal((await qualifies(two, secondProfile.updated_at)).status, 'under_review')
  let totals = await service('select public.referral_summary($1) as stats', [referrer])
  assert.equal(totals.stats.qualified, 1)
  assert.equal(totals.stats.under_review, 1)
  assert.equal(totals.stats.unique_browsers_90d, 1)
  const { id: referralId } = (await db.query('select id from public.referral_attributions where referred_id = $1', [two])).rows[0]
  const adminAction = (actor, request, operation = randomUUID()) => service(
    'select public.admin_monetization_action($1,$2,$3,$4,$5,$6) result',
    [actor, operation, request.action, request.subject, 'Synthetic test', JSON.stringify(request.details)])
  const approval = { action: 'review_referral', subject: referralId, details: { decision: 'approve' } }
  await assert.rejects(adminAction(one, approval), /Administrator required/)
  const approvalId = randomUUID()
  assert.equal((await adminAction(admin, approval, approvalId)).result.status, 'qualified')
  assert.equal((await adminAction(admin, approval, approvalId)).result.status, 'qualified')
  const { updated_at: deletedVersion } = await buildProfile(deletedIdentity, 'Recreated Candidate')
  await verify(deletedIdentity)
  assert.equal((await qualifies(deletedIdentity, deletedVersion)).status, 'qualified')
  await db.query('delete from auth.users where id = $1', [deletedIdentity])
  const rejoined = await register('recreated@example.test')
  const { updated_at: rejoinedVersion } = await buildProfile(rejoined, 'Recreated Candidate')
  await verify(rejoined)
  assert.equal((await qualifies(rejoined, rejoinedVersion)).status, 'rejected')
  totals = await service('select public.referral_summary($1) as stats', [referrer])
  assert.equal(totals.stats.qualified, 3)
  assert.equal(totals.stats.rejected, 1)
  assert.equal((await service('select * from public.wallet_source_summary($1)', [referrer])).earned, 9)

  const complimentary = (actor, operation, serviceKey = 'cover_letter') => service(
    'select public.admin_grant_complimentary_service($1,$2,$3,1,$4,$5) uses',
    [actor, one, serviceKey, 'Synthetic grant', operation])
  const grantId = randomUUID()
  await assert.rejects(complimentary(two, grantId), /Administrator required/)
  assert.equal((await complimentary(admin, grantId)).uses, 1)
  assert.equal((await complimentary(admin, grantId)).uses, 1)
  await assert.rejects(complimentary(admin, grantId, 'interview_qa'), /already used/)
  await asUser(db, one, () => assert.rejects(db.query(
    'select public.admin_grant_complimentary_service($1,$2,$3,1,$4,$5)', [admin, one, 'cover_letter', 'Test', randomUUID()]), /permission denied/))
  const packageId = (await db.query(`insert into public.packages(user_id, profile_id, target_job_title, target_industry, optimization_level, field_visibility_snapshot)
    values($1,$2,'Synthetic engineer','Engineering','easy','{}') returning id`, [one, firstProfile.id])).rows[0].id
  const reserve = (serviceName, operation = randomUUID()) => service(
    'select * from public.reserve_wallet_credits($1,$2,$3,$4,60)', [one, serviceName, operation, packageId + ':test'])
  assert.equal((await reserve('interview_qa')).status, 'insufficient')
  const old = await reserve('cover_letter')
  const clear = () => service('select public.finish_wallet_reservation($1,$2) status', [one, old.reservation_id])
  assert.equal(old.status, 'reserved')
  assert.equal((await reserve('cover_letter')).status, 'insufficient')
  assert.equal((await clear()).status, 'released')

  const active = await reserve('cover_letter')
  const letterId = randomUUID()
  const write = (reservation, owner = one) => service(
    'select public.save_credit_backed_package_result($1,$2,$3,$4,$5,$6,$7) saved',
    [owner, packageId, reservation, 'cover_letter', letterId, JSON.stringify({ id: letterId, full_text: 'Synthetic' }),
      JSON.stringify({ id: randomUUID(), type: 'cover_letter_generated', label: 'Synthetic', at: new Date().toISOString() })])
  assert.equal((await write(active.reservation_id, two)).saved, false)
  assert.equal((await write(old.reservation_id)).saved, false)
  assert.equal((await write(active.reservation_id)).saved, true)
  assert.equal((await write(active.reservation_id)).saved, true)
  const page = (await db.query('select cover_letters from public.packages where id=$1', [packageId])).rows[0]
  assert.equal(page.cover_letters.length, 1)
  assert.equal((await reserve('cover_letter')).status, 'insufficient')

  let audit = (await db.query('select action, admin_id from public.monetization_admin_audit order by action')).rows
  assert.deepEqual(audit.map(row => row.action), ['complimentary_service', 'review_referral'])
  assert(audit.every(row => row.admin_id === admin))

  const manual = { action: 'grant_wallet', subject: one, details: { source: 'promotion', units: 3, expires_at: null } }
  const { result: { lot } } = await adminAction(admin, manual)
  const reversal = { action: 'reverse_wallet', subject: lot, details: { units: 1 } }
  assert.equal((await adminAction(admin, reversal)).result.available, 2)
  await assert.rejects(adminAction(admin, { ...reversal, details: { units: 3 } }), /exceeds/)
  const { reservation_id: stale } = await reserve('interview_qa')
  await db.query("update public.credit_service_reservations set created_at = now() - interval '2 minutes', expires_at = now() - interval '1 minute' where id=$1", [stale])
  assert.equal((await service('select public.reconcile_stale_wallet_reservations() freed')).freed, 1)
  assert.equal((await service('select public.reconcile_stale_wallet_reservations() freed')).freed, 0)
  assert.equal((await service('select * from public.wallet_source_summary($1)', [one])).available, 2)

  const plan = { action: 'configure_wallet', subject: null, details: {
    enforcement_enabled: true, pricing_visible: false,
    prices: { optimization: 3, cover_letter: 1, interview_qa: 2, mock_interview_start: 3 },
  } }
  const configId = randomUUID()
  assert.equal((await adminAction(admin, plan, configId)).result.prices.optimization, 3)
  assert.equal((await adminAction(admin, plan, configId)).result.settings.enforcement_enabled, true)
  const eventReference = randomUUID()
  const purchase = () => service('select public.grant_wallet_credits($1,$2,$3,$4) lot', [one, 'purchase', eventReference, 12])
  assert.equal((await purchase()).lot, (await purchase()).lot, 'synthetic verified purchase is idempotent')
  const sourceRows = await asService(db, () => db.query('select * from public.wallet_source_summary($1)', [one]))
  assert.equal(sourceRows.rows.find(value => value.source === 'purchase').earned, 12)

  const artifactCases = [
    ['optimization', packageId, { optimized_content: { summary: 'Synthetic resume' }, skills_order: [], field_visibility_snapshot: {} }],
    ['interview_qa', randomUUID(), { question_count: 1, questions: [{ question: 'Synthetic question' }] }],
    ['mock_interview_start', randomUUID(), { run: { input_mode: 'text', questions: [] } }],
    ['mock_interview_start', randomUUID(), { run: { input_mode: 'voice',
      questions: Array.from({ length: 5 }, () => ({ id: randomUUID(), question: 'Synthetic question' })) },
      profile: { id: firstProfile.id }, fingerprint: 'synthetic-fingerprint', rubric: 'synthetic-rubric' }],
  ]
  const appropriateEvent = {
    optimization: 'cv_generated', interview_qa: 'qa_generated', mock_interview_start: 'mock_interview_started',
  }
  for (const [type, artifact, data] of artifactCases) {
    if (type === 'mock_interview_start') data.run.id = artifact
    if (type === 'interview_qa') data.id = artifact
    const operation = randomUUID()
    const hold = await reserve(type, operation)
    assert.equal(hold.status, 'reserved')
    const saved = await service('select public.save_credit_backed_package_result($1,$2,$3,$4,$5,$6,$7) saved',
      [one, packageId, hold.reservation_id, type, artifact, JSON.stringify(data),
        JSON.stringify({ id: randomUUID(), type: appropriateEvent[type], label: 'Synthetic', at: new Date().toISOString() })])
    assert.equal(saved.saved, true)
    assert.equal((await reserve(type, operation)).result_id, artifact)
  }
  const artifacts = (await db.query('select optimized_content, interview_question_sets, mock_interview_runs from public.packages where id=$1',
    [packageId])).rows[0]
  assert.equal(artifacts.optimized_content.summary, 'Synthetic resume')
  assert.equal(artifacts.interview_question_sets.length, 1)
  assert.equal(artifacts.mock_interview_runs.length, 2)
  assert.equal((await db.query('select count(*) as sessions from public.voice_interview_sessions where package_id=$1',
    [packageId])).rows[0].sessions, 1)
  assert.equal((await asService(db, () => db.query('select * from public.wallet_source_summary($1)', [one]))).rows.reduce((sum, row) => sum + row.used, 0), 11)

  console.log('Monetization integration passed: profile qualification, admin review and free grants, recreation protection, atomic artifact save, wallet corrections and stale recovery.')
} finally {
  await db.close()
}
