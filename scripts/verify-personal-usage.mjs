/** Exercise real quota helpers with synthetic DB responses; no model spend. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const owner = 'd878fc6b-d9b9-4086-b9fd-422eb8c95e79'
let paused = false, failure = false, reserveStatus = 'reserved'
const calls = []
const service = {
  from(table) {
    const result = () => failure ? { data: null, error: { message: 'synthetic failure' } } : { error: null, data:
      table === 'ai_service_controls' ? { enabled: !paused, daily_limit_per_user: 2, global_daily_limit: 100, max_concurrent_per_user: 1 } :
      table === 'career_profiles' ? [{ id: 'saved' }] :
      table === 'rate_limits' ? [{ count: 5, limit_override: null }] : [] }
    const q = { select() { return q }, eq() { return q }, in() { return q }, or() { return q }, limit() { return q },
      async maybeSingle() { const r = result(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data } },
      then(ok, no) { return Promise.resolve(result()).then(ok, no) } }
    return q
  },
  async rpc(name, args) {
    calls.push({ name, args })
    return { error: null, data: { status: reserveStatus, reservation_id: 'reservation', granted_units: 2 } }
  },
}
const id = require.resolve('../lib/supabase/serviceAdmin.ts')
require.cache[id] = { id, filename: id, loaded: true, exports: { createServiceRoleClient: () => service } }
const { hasUnlimitedPersonalUsage, UNLIMITED_PERSONAL_ALLOWANCE: max } = require('../lib/personalUsage.ts')
const { getRecreationStatus } = require('../lib/recreateLimit.ts')
const { getDefaultDailyLimit, getRateLimitStatus, LIMIT_ACTION_PDF_RENDER } = require('../lib/rateLimit.ts')
const { reserveAction, reserveAiAction } = require('../lib/ai/serviceGuard.ts')
assert.equal(hasUnlimitedPersonalUsage(owner), true)
for (const other of ['', 'jaissatish@gmail.com', 'other-user', owner + ' ']) assert.equal(hasUnlimitedPersonalUsage(other), false)
assert.equal((await getRecreationStatus(owner)).unlimited, true)
assert.equal((await getRecreationStatus(owner)).allowed, true)
assert.equal((await getRecreationStatus('other-user')).allowed, false)
assert.equal((await getRateLimitStatus({ userId: owner, action: 'profile_extraction' })).limit, max)
assert.equal((await getRateLimitStatus({ userId: 'other-user', action: 'profile_extraction', email: 'jaissatish@gmail.com' })).allowed, false)
const action = { userId: owner, action: 'profile_extraction' }
let r = await reserveAiAction(action)
assert.equal(r.ok, true)
assert.equal(calls.at(-1).args.p_limit, max)
assert.equal(calls.at(-1).args.p_global_limit, 100)
assert.equal(calls.at(-1).args.p_max_concurrent, 1)
await r.finish(true); await r.finish(true)
assert.equal(calls.filter(c => c.name === 'consume_rate_limit_reservation').length, 1)
await reserveAiAction({ ...action, userId: 'other-user' })
assert.equal(calls.at(-1).args.p_limit, 2)
const pdf = await reserveAction({ userId: owner, action: LIMIT_ACTION_PDF_RENDER })
assert.equal(pdf.ok, true)
assert.equal(calls.at(-1).args.p_limit, getDefaultDailyLimit(LIMIT_ACTION_PDF_RENDER))
assert.equal(calls.at(-1).args.p_max_concurrent, 1)
await pdf.finish(true)

const duty = await reserveAiAction({ userId: 'other-user', action: 'typical_duties' })
assert.equal(duty.ok, true)
await duty.finish(false)
assert.equal(calls.at(-1).name, 'release_rate_limit_reservation')
const voice = await reserveAiAction({ userId: 'other-user', action: 'mock_interview_answer', units: 5 })
assert.equal(voice.ok, true)
assert.equal(voice.units, 2)
assert.equal(calls.at(-1).name, 'reserve_rate_limit_units')
assert.equal(calls.at(-1).args.p_requested_units, 5)
await voice.finish(1)
assert.equal(calls.at(-1).name, 'settle_rate_limit_units')
assert.equal(calls.at(-1).args.p_successful_units, 1)


paused = true
assert.equal((await reserveAiAction(action)).code, 'paused')
paused = false
for (const status of ['busy', 'global_limit']) { reserveStatus = status; assert.equal((await reserveAiAction(action)).code, status) }
failure = true
const originalError = console.error
console.error = () => {}
try {
  assert.equal((await reserveAiAction(action)).ok, false)
  assert.equal((await getRecreationStatus(owner)).allowed, false)
  assert.equal((await getRateLimitStatus(action)).allowed, false)
} finally { console.error = originalError }
console.log('PASS personal usage: exact account only; daily/monthly allowance; normal limits, pauses, concurrency, capacity, accounting and DB failure preserved')
