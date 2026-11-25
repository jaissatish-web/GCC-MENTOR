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
  console.log('Referral foundation passed: link ownership, first attribution, token binding, signup and email verification, suspension and role boundaries.')
} finally {
  await db.close()
}
