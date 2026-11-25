import assert from 'node:assert/strict'
import { verifyReferralPreview } from './verify-referral-preview-env.mjs'

const project = 'aaaaaaaaaaaaaaaaaaaa'
const token = (ref, role) => 'header.' + Buffer.from(JSON.stringify({
  iss: 'supabase', ref, role, exp: Date.now() / 1000 + 60,
})).toString('base64url') + '.signature'
const options = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: 'feature/referral-credit-monetization',
  GCC_MENTOR_PREVIEW_TEST_REF: project,
  NEXT_PUBLIC_SUPABASE_URL: 'https://' + project + '.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: token(project, 'anon'),
  SUPABASE_SERVICE_ROLE_KEY: token(project, 'service_role'),
  DATABASE_URL: 'preview_disabled',
  RAZORPAY_KEY_ID: 'preview_disabled',
  RAZORPAY_KEY_SECRET: 'preview_disabled',
}
let requests = 0
const accept = async (url, request) => {
  requests++
  assert.equal(url.hostname, project + '.supabase.co')
  assert.equal(request.redirect, 'error')
  return { ok: true }
}
assert.equal(await verifyReferralPreview({ ...options, VERCEL_ENV: 'production' }, accept), false)
await assert.rejects(verifyReferralPreview({ ...options, DATABASE_URL: 'shared-connection' }, accept), /isolated database/)
await assert.rejects(verifyReferralPreview({ ...options, SUPABASE_SERVICE_ROLE_KEY: token('bbbbbbbbbbbbbbbbbbbb', 'service_role') }, accept), /verifiable project/)
await assert.rejects(verifyReferralPreview({ ...options, SUPABASE_SERVICE_ROLE_KEY: 'mock-opaque-key' }, accept), /verifiable project/)
assert.equal(requests, 0)
assert.equal(await verifyReferralPreview(options, accept), true)
assert.equal(requests, 1)
await assert.rejects(verifyReferralPreview(options, async () => ({ ok: false })), /could not authenticate/)
console.log('Referral Preview guard passed: production skips, mismatched keys never transmit, and an isolated key must authenticate.')
