import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const { buildCareerProfileResume } = require('../lib/careerProfileResume.ts')
const { makeQualitySample } = require('../lib/resumeQualitySamples.ts')
const JSZip = require('jszip')
const { NextRequest } = require('next/server')
const original = makeQualitySample(2, 2, 2)
const snapshot = buildCareerProfileResume(original)
snapshot.header.displayName = 'Reviewed Snapshot Candidate'
snapshot.header.targetJobTitle = 'Reviewed Electrical Engineer'
snapshot.experience[0].bullets = ['Reviewed application-specific responsibility']
let user = { id: original.user_id }
let pkg = { id: 'saved-cv', user_id: original.user_id, profile_id: original.id, tier: null, target_job_title: 'Different target', document_snapshot: snapshot }
const changedProfile = { ...original, full_name: 'Changed master profile', professional_summary: 'Changed master summary' }
const rows = {
  packages: () => [pkg], career_profiles: () => [changedProfile],
  profile_work_experience: () => changedProfile.work_experience,
  profile_skills: () => changedProfile.skills, profile_education: () => changedProfile.education,
  profile_certifications: () => changedProfile.certifications, profile_additional_information: () => changedProfile.additional_information,
}
const session = {
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  from(table) {
    const filters = []
    const data = () => rows[table]().filter(row => filters.every(([key, value]) => row[key] === value))
    const q = {
      select: () => q, eq: (key, value) => { filters.push([key, value]); return q },
      maybeSingle: async () => ({ data: data()[0] ?? null, error: null }),
      then: (ok, fail) => Promise.resolve({ data: data(), error: null }).then(ok, fail),
    }
    return q
  },
}
const id = require.resolve('../lib/supabase/server.ts')
require.cache[id] = { id, filename: id, loaded: true, exports: { createClient: async () => session } }
const { GET } = require('../app/api/packages/[id]/docx/route.ts')
const request = () => new NextRequest('http://localhost/api/packages/saved-cv/docx')
const params = { params: Promise.resolve({ id: 'saved-cv' }) }
let response = await GET(request(), params)
assert.equal(response.status, 200)
let zip = await JSZip.loadAsync(await response.arrayBuffer())
let xml = await zip.file('word/document.xml').async('string')
assert.ok(xml.includes('Reviewed Snapshot Candidate'))
assert.ok(xml.includes('Reviewed Electrical Engineer'))
assert.ok(xml.includes('Reviewed application-specific responsibility'))
assert.ok(!xml.includes('Changed master profile') && !xml.includes('Changed master summary'))
pkg = { ...pkg, document_snapshot: { ...snapshot, header: { ...snapshot.header, targetJobTitle: '', headlineEdited: true } } }
response = await GET(request(), params)
zip = await JSZip.loadAsync(await response.arrayBuffer()); xml = await zip.file('word/document.xml').async('string')
assert.ok(!xml.includes('Different target'), 'cleared headline must not return')
user = { id: 'another-user' }; assert.equal((await GET(request(), params)).status, 404)
user = null; assert.equal((await GET(request(), params)).status, 401)
console.log('PASS: actual Word API preserves edited snapshot, explicit blank headline, ownership and authentication')
