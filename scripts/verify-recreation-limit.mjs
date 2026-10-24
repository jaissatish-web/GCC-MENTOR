/** Actual quota helper with synthetic service queries; no real account or model calls. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')

let profile = null, count = 2, override = null, failedTable = null
let paidTables = new Set()
const queried = []
const increments = []
const userId = 'synthetic-owner'
const service = {
  from(table) {
    const filters = []
    let selection
    const result = () => {
      assert.ok(filters.some(([key, value]) => key === 'user_id' && value === userId), table + ' stays scoped to the caller')
      queried.push({ table, selection, filters })
      if (table === failedTable) return { data: null, error: { message: 'Synthetic unavailable query' } }
      if (table === 'career_profiles') {
        assert.equal(selection, 'id', 'profile existence is independent of mutable name data')
        return { data: profile, error: null }
      }
      if (table === 'rate_limits') return { data: { count, limit_override: override }, error: null }
      return { data: paidTables.has(table) ? [{ id: 'synthetic-entitlement' }] : [], error: null }
    }
    const query = {
      select(value) { selection = value; return query },
      eq(key, value) { filters.push([key, value]); return query },
      limit() { return query },
      maybeSingle: async () => result(),
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) },
    }
    return query
  },
  async rpc(name, args) { increments.push({ name, args }); return { error: null } },
}
const moduleId = require.resolve('../lib/supabase/serviceAdmin.ts')
require.cache[moduleId] = { id: moduleId, filename: moduleId, loaded: true, exports: { createServiceRoleClient: () => service } }
const { getRecreationStatus, recordRecreation, monthWindowStart, LIMIT_ACTION_RECREATION } = require('../lib/recreateLimit.ts')
const priorFree = process.env.RECREATIONS_PER_MONTH_FREE
const priorPaid = process.env.RECREATIONS_PER_MONTH_PAID
process.env.RECREATIONS_PER_MONTH_FREE = '2'
process.env.RECREATIONS_PER_MONTH_PAID = '5'
try {
  // The first build remains free even if a previous usage row exists.
  let status = await getRecreationStatus(userId)
  assert.equal(status.isRecreate, false)
  assert.equal(status.allowed, true)
  assert.equal(status.used, 2)

  // Skipping name collection cannot bypass the existing monthly cap.
  profile = { id: 'saved-profile', full_name: '' }
  status = await getRecreationStatus(userId)
  assert.equal(status.isRecreate, true)
  assert.equal(status.allowed, false)
  assert.equal(status.remaining, 0)
  assert.match(status.message, /used all 2 profile recreations/)
  count = 1
  status = await getRecreationStatus(userId)
  assert.equal(status.allowed, true)
  assert.equal(status.remaining, 1)
  profile.full_name = 'Completed Later'
  const named = await getRecreationStatus(userId)
  assert.deepEqual(named, status, 'later name completion does not change quota eligibility or usage')

  // Existing paid-entitlement and per-user override arithmetic remains intact.
  for (const table of ['packages', 'user_service_credits', 'optimization_credits']) {
    paidTables = new Set([table]); count = 4
    status = await getRecreationStatus(userId)
    assert.equal(status.paid, true)
    assert.equal(status.limit, 5)
    assert.equal(status.remaining, 1)
    assert.equal(status.allowed, true)
    count = 5
    assert.equal((await getRecreationStatus(userId)).allowed, false)
  }
  paidTables = new Set(); count = 3; override = 4
  status = await getRecreationStatus(userId)
  assert.equal(status.limit, 4)
  assert.equal(status.remaining, 1)
  override = 0
  assert.equal((await getRecreationStatus(userId)).allowed, false)

  // A failed profile lookup cannot accidentally authorize an unmetered import.
  failedTable = 'career_profiles'
  const originalError = console.error
  console.error = () => {}
  try { status = await getRecreationStatus(userId) } finally { console.error = originalError }
  assert.equal(status.allowed, false)
  assert.equal(status.isRecreate, true)
  assert.equal(status.remaining, 0)
  failedTable = null

  await recordRecreation(userId)
  assert.deepEqual(increments, [{ name: 'increment_rate_limit', args: { p_user_id: userId, p_action: LIMIT_ACTION_RECREATION, p_window_start: monthWindowStart() } }])
  assert.ok(queried.filter(q => q.table === 'rate_limits').every(q => q.filters.some(([key, value]) => key === 'action' && value === LIMIT_ACTION_RECREATION)))
  console.log('PASS recreation quotas: nameless saved profiles are metered; first build, paid access, overrides, fail-closed lookup and atomic increment preserved')
} finally {
  if (priorFree === undefined) delete process.env.RECREATIONS_PER_MONTH_FREE; else process.env.RECREATIONS_PER_MONTH_FREE = priorFree
  if (priorPaid === undefined) delete process.env.RECREATIONS_PER_MONTH_PAID; else process.env.RECREATIONS_PER_MONTH_PAID = priorPaid
}
