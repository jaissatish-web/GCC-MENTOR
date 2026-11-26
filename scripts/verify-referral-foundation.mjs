import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { applyMigrations, asAnon, asService, asUser, createAuthUser, createSupabaseLikeDb } from './db/supabaseStub.mjs'

const db = await createSupabaseLikeDb()
try {
  await applyMigrations(db, 'supabase/migrations')
  const owner = await createAuthUser(db, 'referrer@example.test')
  const second = await createAuthUser(db, 'other-referrer@example.test')
  const linkSql = 'select (public.get_or_create_referral_link($1)).code'
  const linkFor = async (id) => (await asService(db, () => db.query(linkSql, [id]))).rows[0].code
  assert.equal(await linkFor(owner), null, 'disabled program issues no links')
  await db.exec('update public.referral_program_settings set enabled = true')
  const code = await linkFor(owner)
  const otherCode = await linkFor(second)
  assert.match(code, /^[0-9A-F]{24}$/)
  assert.equal(await linkFor(owner), code, 'repeated generation returns the same code')
  assert.notEqual(otherCode, code, 'a different owner gets a different code')
  await asAnon(db, () => assert.rejects(db.query(linkSql, [owner]), /permission denied/))
  await asUser(db, owner, () => assert.rejects(db.query('select * from public.referral_links'), /permission denied/))
  await asUser(db, owner, () => assert.rejects(db.query('select * from public.referral_attributions'), /permission denied/))

  const browser = randomUUID()
  const visit = async (ref, browserId, existing = null) =>
    (await asService(db, () => db.query('select * from public.record_referral_visit($1, $2, $3)', [ref, browserId, existing]))).rows[0]?.claim_id
  const claim = await visit(code, browser)
  assert.match(claim, /^[0-9a-f-]{36}$/)
  assert.equal(await visit(otherCode, browser, claim), claim, 'first valid link wins')
  assert.equal(await visit('invented', browser), undefined)

  const intent = async (visitId, browserId, email) =>
    (await asService(db, () => db.query('select public.create_referral_signup_intent($1, $2, $3) as id', [visitId, browserId, email]))).rows[0].id
  assert.equal(await intent(claim, randomUUID(), 'candidate@example.test'), null, 'second browser cannot consume the claim')
  const token = await intent(claim, browser, 'Candidate@Example.Test')
  const signup = async (email, metadata) =>
    (await db.query('insert into auth.users(email, raw_user_meta_data) values($1, $2) returning id', [email, JSON.stringify(metadata)])).rows[0].id
  const attribution = async (id) =>
    (await db.query('select referrer_id, status from public.referral_attributions where referred_id = $1', [id])).rows[0]
  assert.equal(await attribution(await signup('wrong@example.test', { referral_signup_intent: token })), undefined)
  assert.equal(await attribution(await signup('fake@example.test', { referral_signup_intent: randomUUID() })), undefined)
  const candidate = await signup('candidate@example.test', { referral_signup_intent: token })
  assert.deepEqual(await attribution(candidate), { referrer_id: owner, status: 'pending_verification' })
  await db.query('update auth.users set email_confirmed_at = now() where id = $1', [candidate])
  assert.deepEqual(await attribution(candidate), { referrer_id: owner, status: 'incomplete_profile' })
  assert.equal(await attribution(await signup('candidate@example.test', { referral_signup_intent: token })), undefined, 'signup intent is single-use')
  await db.query('update public.referral_links set suspended_at = now() where owner_id = $1', [owner])
  assert.equal(await visit(code, randomUUID()), undefined)
  assert.equal(await linkFor(owner), code, 'suspension preserves permanent link')
  await db.query('update auth.users set email = $1 where id = $2', ['changed@example.test', owner])
  assert.equal(await linkFor(owner), code, 'email changes preserve permanent link')

  await db.exec('update public.referral_program_settings set hourly_visit_threshold = 1')
  const recentBrowser = randomUUID()
  const recentClaim = await visit(otherCode, recentBrowser)
  assert.ok(recentClaim)
  assert.equal(await visit(otherCode, recentBrowser), undefined, 'the browser rate limit prevents a new visit')
  assert.equal(await visit(otherCode, recentBrowser, recentClaim), recentClaim, 'the rate limit preserves an existing attribution')
  assert.ok(await visit(otherCode, randomUUID()), 'an independent browser can still be attributed')

  const expiredIntent = await intent(recentClaim, recentBrowser, 'expired@example.test')
  const liveIntent = await intent(recentClaim, recentBrowser, 'current@example.test')
  assert.ok(expiredIntent && liveIntent)
  await db.query('update public.referral_signup_intents set expires_at = now() - interval \'1 minute\' where id = $1', [expiredIntent])
  await db.query(`update public.referral_visit_claims
    set created_at = now() - interval '91 days', expires_at = now() - interval '61 days'
    where id = $1`, [claim])
  const oldDigest = 'a'.repeat(64)
  const newDigest = 'b'.repeat(64)
  await db.query(`insert into public.referral_reward_identities(identity_digest, awarded_at)
    values ($1, now() - interval '366 days'), ($2, now())`, [oldDigest, newDigest])
  const summary = async () => (await asService(db, () =>
    db.query('select public.referral_summary($1) as stats', [owner]))).rows[0].stats
  const beforePrune = await summary()
  await asService(db, () => db.query('select public.prune_referral_tracking()'))
  assert.deepEqual(await summary(), beforePrune, 'pruning preserves lifetime totals and visible activity')
  const findClaim = await db.query('select id from public.referral_visit_claims where id = any($1::uuid[])', [[claim, recentClaim]])
  assert.deepEqual(findClaim.rows.map(row => row.id), [recentClaim])
  const findIntent = await db.query('select id from public.referral_signup_intents where id = any($1::uuid[])', [[expiredIntent, liveIntent]])
  assert.deepEqual(findIntent.rows.map(row => row.id), [liveIntent])
  const findDigest = await db.query('select identity_digest from public.referral_reward_identities order by identity_digest')
  assert.deepEqual(findDigest.rows.map(row => row.identity_digest), [newDigest])
  await asUser(db, owner, () => assert.rejects(db.query('select * from public.referral_reward_identities'), /permission denied/))
  console.log('Referral foundation passed: attribution, rate limits, retention, permanent links and role boundaries.')
} finally {
  await db.close()
}
