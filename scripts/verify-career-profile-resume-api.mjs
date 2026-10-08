import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const mock = (path, exports) => { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } }
let summaries = []
let user = { id: 'owner' }, profile = { id: 'profile', user_id: 'owner' }, rows = [], insertCount = 0, failInsert = false, racing = false
const session = {
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  rpc: async () => ({ data: summaries, error: null }),
  from(table) {
    const filters = []
    const q = {
      select: () => q,
      eq: (key, value) => { filters.push([key, value]); return q },
      then: (resolve, reject) => Promise.resolve({ data: rows.filter((r) => filters.every(([k, v]) => r[k] === v)), error: null }).then(resolve, reject),
      maybeSingle: async () => ({ data: (table === 'career_profiles' ? (profile ? [profile] : []) : rows).find((r) => filters.every(([k, v]) => r[k] === v)) ?? null, error: null }),
    }
    return q
  },
}
mock('../lib/supabase/server.ts', { createClient: async () => session })
mock('../lib/packages/serverWrites.ts', { insertPackageForUser: async ({ userId, row }) => {
  insertCount++
  if (failInsert) return { row: null, error: 'unavailable' }
  if (!rows.some((r) => r.user_id === userId && r.tier === 'free')) rows.push({ ...row, user_id: userId, id: 'raw-' + userId })
  if (racing) return { row: null, error: 'duplicate' }
  return { row: rows.find((r) => r.user_id === userId && r.tier === 'free'), error: null }
} })
const { POST } = require('../app/api/packages/career-profile/route.ts')
user = null
assert.equal((await POST()).status, 401)
assert.equal(insertCount, 0)
user = { id: 'owner' }; profile = null
assert.equal((await (await POST()).json()).needs_profile, true)
assert.equal(insertCount, 0)
profile = { id: 'profile', user_id: 'other' }
assert.equal((await (await POST()).json()).needs_profile, true)
profile.user_id = 'owner'
const created = (await (await POST()).json()).package
assert.equal(created.name, 'My Career Profile Resume')
assert.equal(created.tier, 'free')
assert.equal(created.optimized_content, null)
assert.equal(created.document_snapshot, null)
rows[0].name = 'My Master Engineering CV'
rows[0].template_id = 'ats_classic'
await Promise.all(Array.from({ length: 10 }, () => POST()))
assert.equal(insertCount, 1)
assert.equal(rows.length, 1)
assert.equal(rows[0].name, 'My Master Engineering CV')
assert.equal(rows[0].template_id, 'ats_classic')
rows = []; racing = true
assert.equal((await (await POST()).json()).package.id, 'raw-owner')
rows = []; racing = false; failInsert = true
assert.equal((await POST()).status, 500)
failInsert = false
rows = [{ id: 'other-package', user_id: 'other', tier: 'free' }]
const own = (await (await POST()).json()).package
assert.equal(own.user_id, 'owner')
assert.equal(rows[0].id, 'other-package')
// Call the actual PATCH route: raw content writes are rejected before derived
// content, scoring or privileged writes; owner metadata still uses the existing path.
const { PATCH } = require('../app/api/packages/[id]/route.ts')
for (const key of ['document', 'summary', 'experience_blocks', 'suggestion_actions']) {
  const response = await PATCH(new Request('http://localhost/api/packages/raw-owner', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: {} }) }), { params: Promise.resolve({ id: 'raw-owner' }) })
  assert.equal(response.status, 409, key)
}
const foreign = await PATCH(new Request('http://localhost/api/packages/other-package', { method: 'PATCH', body: '{}' }), { params: Promise.resolve({ id: 'other-package' }) })
assert.equal(foreign.status, 404)
const { NextRequest } = require('next/server')
const { GET } = require('../app/api/packages/route.ts')
rows = [
  { id: 'raw-owner', user_id: 'owner', tier: 'free', status: 'saved' },
  { id: 'optimized-owner', user_id: 'owner', tier: null, status: 'applied' },
]
summaries = rows.map((r, i) => ({ ...r, created_at: `2026-10-0${8-i}T00:00:00Z` }))
const list = await (await GET(new NextRequest('http://localhost/api/packages?view=summary&counts=1&limit=1'))).json()
assert.equal(list.packages.length, 0)
assert.equal(list.total, 1)
assert.equal(list.counts.saved, 0)
assert.equal(list.counts.applied, 1)
assert.equal(list.next_cursor.before_id, 'raw-owner') // filtered page still advances
const { POST: optimize } = require('../app/api/optimize/route.ts')
const refused = await optimize(new Request('http://localhost/api/optimize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId: 'raw-owner' }) }))
assert.equal(refused.status, 409)
console.log('PASS: actual API auth, missing/foreign profiles, creation, repeat clicks, race recovery, saved preferences, errors and raw snapshot guards')
