import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register'); require('./resolve-paths.ts')
const { attempt } = require('./verify-interview-progress.ts')
let user = null, fail = false, reads = 0
const rows = Array.from({ length: 102 }, (_, i) => ({ id: `resume-${i}`, mock_interview_runs: [attempt(1, 50), attempt(2, 65)] }))
const id = require.resolve('../lib/supabase/server.ts')
require.cache[id] = { id, filename: id, loaded: true, exports: { createClient: async () => ({
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  from(table) {
    assert.equal(table, 'packages'); reads++
    let owner = false
    const query = {
      select(columns) { assert.equal(columns, 'id,mock_interview_runs'); return query },
      eq(key, value) { assert.equal(key, 'user_id'); assert.equal(value, user.id); owner = true; return query },
      order() { return query },
      async range(start, end) { assert.ok(owner, 'Every page is explicitly owner-scoped'); return { data: fail ? null : rows.slice(start, end + 1), error: fail ? new Error('offline') : null } },
    }
    return query
  },
}) } }
const { GET } = require('../app/api/mock-interview/progress/route.ts')
assert.equal((await GET()).status, 401); assert.equal(reads, 0)
user = { id: 'owner' }
const response = await GET(), body = await response.json()
assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store')
assert.equal(body.progress.length, 102); assert.equal(body.attempts, 204); assert.equal(reads, 2)
assert.equal(body.progress[0].progress.metrics[0].delta, 15)
assert.ok(!JSON.stringify(body).includes('questions') && !JSON.stringify(body).includes('transcript'))
fail = true; assert.equal((await GET()).status, 503)
console.log('PASS: progress API auth, explicit owner scope on every page, >100 resumes, private uncached minimal output, safe backend failure')
