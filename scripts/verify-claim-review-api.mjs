import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const mock = (path, exports) => { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } }
const { makeTemplateFixture } = require('./fixtures/templateFixture.ts')
const { buildResumeDocument } = require('../lib/resumeDocument.ts')
const { profile, optimizedContent, skillsOrder } = makeTemplateFixture()
const document = buildResumeDocument({ profile, optimizedContent, skillsOrder, fieldVisibility: profile.field_visibility, targetJobTitle: 'Instrumentation Engineer' })
const role = document.experience[0]
const claim = 'Performed control valve calculations using CONVAL.'
role.bullets.push(claim)
const report = { report_version: 1, mode: 'job_description', before: { total: 50 }, after: { total: 75 }, qualifications: null,
  target: { job_title: 'Instrumentation Engineer', title_variants: [], mode: 'job_description', keywords: [{ term: 'CONVAL', aliases: [], importance: 'must', kind: 'tool' }] },
  auto_applied: true, suggestions: [{ id: 's1', block: role.entry.id, requirement: 'CONVAL', text: claim, status: 'confirmed' }] }
let user = { id: 'owner' }
const row = { id: 'legacy', user_id: 'owner', profile_id: profile.id, tier: 'basic', optimized_content: optimizedContent, document_snapshot: document, match_report: report }
const writes = []
const session = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from() {
  const filters = []
  const q = { select: () => q, eq: (k,v) => { filters.push([k,v]); return q }, maybeSingle: async () => ({data: filters.every(([k,v]) => row[k] === v) ? structuredClone(row) : null, error: null }) }
  return q
} }
mock('../lib/supabase/server.ts', { createClient: async () => session })
mock('../lib/packages/serverWrites.ts', { appendPackageEventAtomic: async () => true, updatePackageServerFields: async (v) => { writes.push(v); return { row: {id: v.packageId}, error: null } } })
const { PATCH } = require('../app/api/packages/[id]/route.ts')
const request = (body) => new Request('http://localhost/api/packages/legacy', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
const call = (body, id = 'legacy') => PATCH(request(body), {params: Promise.resolve({id})})
user = null
assert.equal((await call({summary: {user_edited: 'Test'}})).status, 401)
user = { id: 'owner' }
assert.equal((await call({}, 'foreign')).status, 404)
assert.equal((await call({summary: {user_edited: 'Changed words'}})).status, 409)
assert.equal(writes.length, 0, 'No privileged write before all legacy claims receive a decision')
for (const action of ['confirm', 'dismiss']) {
  const response = await call({suggestion_actions: [{id: 's1', action}]})
  assert.equal(response.status, 200, await response.clone().text())
  const saved = writes.at(-1)
  assert.equal(saved.userId, 'owner')
  assert.equal(saved.packageId, 'legacy')
  assert.equal(saved.fields.match_report.auto_applied, false)
  assert.equal(saved.fields.match_report.suggestions[0].status, action === 'confirm' ? 'confirmed' : 'dismissed')
  const bullets = saved.fields.document_snapshot.experience.find(x => x.entry.id === role.entry.id).bullets
  assert.equal(bullets.filter(x => x === claim).length, action === 'confirm' ? 1 : 0)
}
assert.equal(row.match_report.auto_applied, true, 'Test requests do not mutate original history')
console.log('PASS: actual claim-review PATCH auth/ownership, fail-closed gate, explicit confirmation, dismissal, single inclusion and refreshed saved score')
