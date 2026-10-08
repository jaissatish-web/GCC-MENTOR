import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const { makeTemplateFixture } = require('./fixtures/templateFixture.ts')
const { careerProfileServiceContext } = require('../lib/careerProfileServiceContext.ts')
const { careerProfileResumeSummary } = require('../lib/careerProfileResumeSummary.ts')
const { cvReady } = require('../lib/packageSummary.ts')
const fixture = makeTemplateFixture()
let profile = fixture.profile
const context = careerProfileServiceContext(profile)
assert.equal(context.jobDescription, null)
assert.equal(context.target.target_company, null)
assert.equal(context.target.target_industry, null)
assert.equal(context.target.target_country, null)
assert.equal(context.target.target_job_title, profile.target_job_title)
assert.equal(cvReady({ tier: 'free', optimized_content: null }), true)
assert.equal(cvReady({ tier: null, optimized_content: null }), false)
const fallback = careerProfileServiceContext({ ...profile, target_job_title: null })
assert.ok(profile.work_experience.some(r => r.role === fallback.target.target_job_title))
assert.equal(careerProfileServiceContext({ ...profile, target_job_title: null, work_experience: [] }).target.target_job_title, 'Career opportunities')

// Compare optimized prompts to the shipped implementation, including default args.
// Golden hashes captured from shipped af19fe2. Exclude the date-dependent Gulf experience sentence.
for (const [file, fn, args] of [
  ['buildCoverLetterPrompt', 'buildCoverLetterPrompt', [profile, { target_job_title: 'Engineer', target_company: 'Acme', target_country: 'saudi_arabia', target_industry: 'engineering' }, 'A real advert', 'professional', fixture.document, { totalYears: 12, gaps: ['missing tool'] }]],
  ['buildInterviewQaPrompt', 'buildInterviewQaParts', [profile, context.resume, { target_job_title: 'Engineer', target_company: 'Acme', target_country: 'saudi_arabia', target_industry: 'engineering' }, 'A real advert', 'Real facts']],
  ['buildMockInterviewPrompt', 'buildMockInterviewStartPrompt', [profile, context.resume, { target_job_title: 'Engineer', target_company: 'Acme', target_country: 'saudi_arabia', target_industry: 'engineering' }, 'A real advert', { mode: 'mixed', difficulty: 'standard', questionCount: 5 }]],
]) {
  const path = require.resolve(`../lib/ai/${file}.ts`)
  const expected = {
    buildCoverLetterPrompt: '55b347b6d0901c979260ebd7012bb676cf06cfbe6ea775ca0b618160f73128a2',
    buildInterviewQaParts: 'ddec5f83039e0cb0093e556aca309e601686467ff6ff62ed665b4045fc88784c',
    buildMockInterviewStartPrompt: 'd70581d2de447b607aa24af09626b53086b2ef713135f007ec8965486e6d603d',
  }
  const hash = createHash('sha256').update(JSON.stringify(require(path)[fn](...args)).replace(/Gulf \(GCC\) experience: [^\\]+/g,'GULF FACT LINE')).digest('hex')
  assert.equal(hash, expected[fn], `${fn}: optimized prompts unchanged`)
}
const mock = (path, exports) => { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } }
let user = { id: 'owner' }, failProfile = false, failAi = false, calls = [], finishes = [], writes = []
let row = { ...fixture.pkg, id: 'raw-owner', user_id: 'owner', profile_id: profile.id, tier: 'free', name: 'Astronaut CEO', target_job_title: 'STALE TITLE', target_company: 'STALE COMPANY', target_country: 'uae', target_industry: 'STALE INDUSTRY', job_description: 'STALE ADVERT 987654', optimized_content: { summary: { generated: 'STALE AI' } }, document_snapshot: { header: {}, summary: 'STALE SNAPSHOT', experience: [], skills: [], certifications: [] }, match_report: { target: { keywords: [{ term: 'STALE REQUIREMENT' }] } }, cover_letters: [], interview_questions: null, mock_interview_runs: [] }
const session = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from() {
  const filters = []
  const q = { select: () => q, eq: (k,v) => { filters.push([k,v]); return q }, maybeSingle: async () => ({ data: filters.every(([k,v]) => row[k] === v) ? row : null, error: null }) }
  return q
} }
mock('../lib/supabase/server.ts', { createClient: async () => session })
const { ProfileLoadError } = require('../lib/packages/profileLoader.ts')
mock('../lib/packages/profileLoader.ts', { ProfileLoadError, loadCareerProfileFull: async (_db, id, owner) => { assert.equal(id, profile.id); assert.equal(owner, user.id); if (failProfile) throw new ProfileLoadError('skills'); return profile } })
mock('../lib/ai/serviceGuard.ts', { reserveAiAction: async () => ({ ok: true, finish: async (ok) => finishes.push(ok) }) })
mock('../lib/packages/serverWrites.ts', {
  appendCoverLetterAtomic: async (v) => { writes.push(v); return true },
  setInterviewQuestionsAtomic: async (v) => { writes.push(v); return true },
  appendMockRunAtomic: async (v) => { writes.push(v); return true },
})
mock('../lib/ai/provider.ts', { generate: async (v) => {
  calls.push(v); if (failAi) throw new Error('offline')
  return { text: JSON.stringify({ greeting: 'Dear Hiring Manager,', opening_paragraph: 'My experience is described in my resume.', body_paragraphs: ['I would welcome the opportunity to discuss my work and career direction.'], closing_paragraph: 'Thank you for considering my profile.', sign_off: 'Sincerely,' }) }
} })
mock('../lib/ai/runTask.ts', { AiTaskError: class extends Error {}, runAiTask: async (v) => {
  calls.push(v); if (failAi) throw new Error('offline')
  if (v.service === 'qa_generation') {
    const part = calls.filter(c => c.service === 'qa_generation').length
    return { value: { questions: Array.from({ length: 5 }, (_, i) => ({ category: 'technical', difficulty: 'standard', question: `Part ${part} practice question ${i}: what does this duty involve?`, answer: 'I would explain my own responsibilities using my saved profile.', why_asked: 'Checks real experience', resume_basis: 'Saved profile duties', follow_up: null, tags: [`topic-${part}-${i}`] })) } }
  }
  return { value: { opening_note: 'Profile-based practice', questions: Array.from({ length: 5 }, (_, i) => ({ category: 'technical', focus: `topic-${i}`, question: `How do you explain your responsibility ${i}?`, ideal_answer_points: ['Use your own recorded duties'] })) } }
} })
mock('../lib/voice/server.ts', {
  voiceEnabled: () => true, transcriptionReady: async () => true,
  voiceAdmin: () => ({
    from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }),
    rpc: async (_name, v) => {
      assert.equal(v.p_user_id, 'owner'); assert.equal(v.p_profile.id, profile.id)
      assert.equal(v.p_run.target_company, null)
      writes.push({ userId: v.p_user_id, packageId: v.p_package_id, run: v.p_run }); return { data: true, error: null }
    },
  }),
})
const routes = [
  [require('../app/api/packages/[id]/cover-letter/route.ts').POST, { tone: 'technical' }],
  [require('../app/api/packages/[id]/interview-qa/route.ts').POST, {}],
  [require('../app/api/packages/[id]/mock-interview/start/route.ts').POST, { questionCount: 5, inputMode: 'text' }],
  [require('../app/api/packages/[id]/mock-interview/start/route.ts').POST, { questionCount: 5, inputMode: 'voice' }],
]
const request = (body) => new Request('http://localhost/api/packages/raw-owner/service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
for (const [post, body] of routes) {
  user = null
  assert.equal((await post(request(body), { params: Promise.resolve({ id: 'raw-owner' }) })).status, 401)
  user = { id: 'owner' }
  assert.equal((await post(request(body), { params: Promise.resolve({ id: 'foreign' }) })).status, 404)
  failProfile = true
  assert.equal((await post(request(body), { params: Promise.resolve({ id: 'raw-owner' }) })).status, 503)
  failProfile = false
}
const before = JSON.stringify(row)
for (const [post, body] of routes) {
  const response = await post(request(body), { params: Promise.resolve({ id: 'raw-owner' }) })
  assert.equal(response.status, 200, await response.clone().text())
}
assert.equal(JSON.stringify(row), before, 'service generation never rewrites raw or optimized resume content')
assert.equal(writes.length, 4)
assert.equal(writes[0].meta.source, 'career_profile')
assert.equal(writes[1].questions.source, 'career_profile')
for (const write of writes) {
  assert.equal(write.userId, 'owner'); assert.equal(write.packageId, 'raw-owner')
  const artifact = write.letter ?? write.questions ?? write.run
  assert.equal(artifact.target_job_title, profile.target_job_title)
  assert.equal(artifact.target_company, null)
}
for (const call of calls) {
  const text = [call.system, call.user, call.persona, call.instructions, call.input].filter(Boolean).join('\n')
  assert.ok(text.includes('PROFILE-ONLY PREPARATION'))
  for (const stale of ['STALE ADVERT','STALE COMPANY','STALE TITLE','STALE AI','STALE SNAPSHOT','STALE REQUIREMENT','Astronaut CEO']) assert.ok(!text.includes(stale), `must not use ${stale}`)
}
assert.ok(finishes.every(Boolean))
// Changes to the master profile are used on the very next generation.
profile = { ...profile, target_job_title: 'Updated professional field', professional_summary: 'Latest saved words' }
assert.equal((await routes[0][0](request({}), { params: Promise.resolve({ id: 'raw-owner' }) })).status, 200)
assert.equal(writes.at(-1).letter.target_job_title, 'Updated professional field')
assert.ok(calls.at(-1).user.includes('Latest saved words'))
failAi = true
assert.equal((await routes[2][0](request(routes[2][1]), { params: Promise.resolve({ id: 'raw-owner' }) })).status, 502)
assert.equal(finishes.at(-1), false)
const summary = careerProfileResumeSummary({ ...row, cover_letters: [{ full_text: 'PRIVATE LETTER' }], interview_questions: { questions: ['PRIVATE ANSWER'] }, mock_interview_runs: [{ id: 'run', status: 'completed', generated_at: '2026-10-08', final_report: { private: 'PRIVATE REPORT' } }] })
assert.equal(summary.cover_letter_count, 1); assert.equal(summary.qa_question_count, 1); assert.equal(summary.mock_completed_run_id, 'run')
assert.ok(!JSON.stringify(summary).includes('PRIVATE'))
console.log('PASS: profile-only cover letter/Q&A/mock routes, ownership, failed reads/AI, live profile updates, no fabricated job metadata, lightweight summaries and optimized-prompt parity')
