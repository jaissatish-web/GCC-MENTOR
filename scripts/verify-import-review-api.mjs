import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
let calls = 0, failProofread = false
const draft = { full_name: 'Satish', email: 'satish@example.com', phone: '+919876543210', work_experience: [{ company: 'ACME', role: 'Engineer', start_date: 'Mar 2019', end_date: 'Present', description: 'Responsible for testing and commission of instruments.', highlights: ['Maintanance of DCS systems for 3 units.'], sort_order: 1 }], skills: [{ name: 'DCS', sort_order: 1 }], education: [], certifications: [], additional_information: [] }
const source = 'Satish\nsatish@example.com\nPhone: +919876543210\nWork Experience\nACME | Engineer | Mar 2019 - Present\nResponsible for testing and commission of instruments.\nMaintanance of DCS systems for 3 units.\nSkills\nDCS\nPassport: x1234567'
const provider = require.resolve('../lib/ai/provider.ts')
require.cache[provider] = { id: provider, filename: provider, loaded: true, exports: { generate: async params => {
  calls++
  const proof = params.system.startsWith('You proofread')
  if (proof && failProofread) throw new Error('simulated unavailable provider')
  if (proof) { assert.ok(params.giveUpAt <= Date.now() + 15000); assert.ok(!params.user.includes('x1234567')) }
  return { text: JSON.stringify(proof ? { changes: [{ field: 'work_experience.0.description', after: 'Responsible for testing and commissioning instruments.' }] } : draft), inputTokens: 10, outputTokens: 20, truncated: false }
} } }
const { extractProfile } = require('../lib/resumeParse/pipeline.ts')
const signedIn = await extractProfile(source, { route: '/api/parse/text', userId: 'owner' })
assert.ok(signedIn.ok)
assert.equal(calls, 2)
assert.ok(signedIn.report.review.changes.some(c => c.kind === 'wording' && c.suggested))
assert.equal(signedIn.draft.work_experience[0].description, draft.work_experience[0].description)
assert.ok(signedIn.report.review.changes.some(c => c.kind === 'spelling'))
failProofread = true
const fallback = await extractProfile(source, { route: '/api/parse/text', userId: 'owner' })
assert.ok(fallback.ok)
assert.equal(fallback.report.review.wordingStatus, 'unavailable')
calls = 0
const anon = await extractProfile(source, { route: '/api/ats-scan' })
assert.ok(anon.ok)
assert.equal(calls, 1)
assert.equal(anon.report.review, undefined)
assert.equal(anon.draft.work_experience[0].highlights[0], draft.work_experience[0].highlights[0])

let user = { id: 'owner' }, reviewRow = { review: signedIn.report.review }, pendingRow = { report: signedIn.report }
const server = require.resolve('../lib/supabase/server.ts')
require.cache[server] = { id: server, filename: server, loaded: true, exports: { createClient: async () => ({
  auth: { getUser: async () => ({ data: { user } }) },
  from(table) {
    assert.ok(['resume_import_reviews', 'pending_profile_drafts'].includes(table))
    let removing = false, patch, own = false
    const result = () => {
      assert.ok(own, 'every read/write scoped to authenticated owner')
      const row = table === 'resume_import_reviews' ? reviewRow : pendingRow
      if (removing) { if (table === 'resume_import_reviews') reviewRow = null; else pendingRow = null }
      if (patch && row) Object.assign(row, patch)
      return { data: row, error: null }
    }
    const q = { select: () => q, delete: () => { removing = true; return q }, update: value => { patch = value; return q }, eq: (key, value) => { assert.equal(key, 'user_id'); assert.equal(value, user.id); own = true; return q }, maybeSingle: async () => result(), then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject) }
    return q
  },
}) } }
const route = require('../app/api/profile/import-review/route.ts')
user = null
assert.equal((await route.GET()).status, 401)
assert.equal((await route.DELETE()).status, 401)
user = { id: 'owner' }
const read = await route.GET()
assert.equal(read.headers.get('cache-control'), 'private, no-store')
assert.equal((await read.json()).review.id, signedIn.report.review.id)
assert.equal((await route.DELETE()).status, 200)
assert.equal(reviewRow, null)
assert.equal(pendingRow.report.review, undefined)
assert.ok(pendingRow.report.warnings, 'pending extraction is retained while comparison is removed')
console.log('PASS import review pipeline/API: signup proofreading, safe fallback, unchanged anonymous flow, auth/ownership, no-store and full comparison removal')
