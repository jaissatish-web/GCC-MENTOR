import './resolve-paths'
import assert from 'node:assert/strict'
import { evaluateMustHaves } from '../lib/gulfReadiness/mustHaves'
import { detectGulfEssentials } from '../lib/gulfReadiness/essentials'
import { HANDOFF_KEY, HANDOFF_TTL_MS, readHandoff, saveHandoff } from '../lib/gulfReadiness/handoff'
import { documentWithoutAutomaticClaims, needsClaimReview, reviewSuggestions } from '../lib/optimizer/claimReview'
import { gapTermsFromMatchReport, contradictsSavedCv } from '../lib/ai/proseClaims'
import { makeTemplateFixture } from './fixtures/templateFixture'
import { buildV3 } from '../lib/optimizer/v3/service'
import * as writer from '../lib/optimizer/v3/engine'
import type { ResumeDocument } from '../lib/resumeDocument'
import type { MatchReport } from '../lib/optimizer/types'

const today = new Date('2026-10-10T00:00:00Z')
for (const text of ['Instrument engineer. SCE registration not obtained.', 'Engineer. SCE expired.', 'Engineer. SCE registered.']) {
  assert.equal(evaluateMustHaves(text, { targetCountry: 'saudi_arabia' }, today).find((x) => x.key === 'professional_licence')?.status, 'unknown')
}
for (const text of ['Nurse. DHA not obtained.', 'Nurse. DHA registered.', 'Nurse. DataFlow verified, Prometric passed.']) {
  assert.equal(evaluateMustHaves(text, { targetCountry: 'saudi_arabia' }, today).find((x) => x.key === 'professional_licence')?.status, 'unknown', 'A regulator mention for another country cannot prove Saudi licensing')
}
for (const status of ['done', 'not_started', 'in_progress'] as const) {
  const expected = { done: 'ok', not_started: 'missing', in_progress: 'in_progress' }[status]
  assert.equal(evaluateMustHaves('Engineer. SCE registered.', { targetCountry: 'saudi_arabia', professionalLicence: status }, today).find((x) => x.key === 'professional_licence')?.status, expected)
}
const visa = (visaStatus: string, visaTransferable?: boolean) => detectGulfEssentials('', { visaStatus, visaTransferable }, true).find((x) => x.key === 'visa_or_passport')!
assert.equal(visa('Transferable iqama', true).earned, 3)
assert.equal(visa('Transferable iqama').earned, 3)
assert.ok(visa('Transferable iqama', false).earned < 3)
for (const text of ['Non-transferable iqama', 'Cancelled visa', 'Expired employment visa']) {
  assert.ok(visa(text, false).earned < 3)
  assert.ok(visa(text, true).earned < 3, 'Invalid status must veto an inconsistent transferability flag')
}
assert.equal(detectGulfEssentials('Cancelled visa', {}, true).find((x) => x.key === 'visa_or_passport')?.earned, 1)
assert.equal(detectGulfEssentials('Transferable iqama', {}, true).find((x) => x.key === 'visa_or_passport')?.earned, 3)
assert.ok(visa('Not currently transferable iqama').earned < 3)
for (const text of ['Iqama', 'Golden visa', 'Family visa', 'Employment visa']) assert.ok(visa(text).earned < 3)
for (const photo of ['none', 'hidden', 'shown', 'shown_confirmed', 'unknown'] as const) {
  const items = detectGulfEssentials('Arabic. UAE driving licence.', { photo }, true)
  for (const key of ['photo', 'arabic', 'driving_licence']) assert.equal(items.find((x) => x.key === key)?.applicable, false)
}
assert.equal(detectGulfEssentials('', { arabicRequired: true, arabicLevel: 'none' }, true).find((x) => x.key === 'arabic')?.applicable, true)
assert.equal(detectGulfEssentials('UAE driving licence', { drivingLicenceRequired: true, hasDrivingLicence: false }, true).find((x) => x.key === 'driving_licence')?.earned, 0)

const original = 'Commissioned instrument loops.'
const added = 'Performed control valve calculations using CONVAL.'
const doc = { summary: '', skills: [], certifications: [], experience: [{ entry: { id: 'e1' }, bullets: [original, added] }] } as unknown as ResumeDocument
const report = { auto_applied: true, suggestions: [{ id: 's1', block: 'e1', requirement: 'CONVAL', text: added, status: 'confirmed' }] } as MatchReport
assert.equal(needsClaimReview(report), true)
assert.equal(reviewSuggestions(report)[0].status, 'pending')
assert.deepEqual(documentWithoutAutomaticClaims(doc, report).experience[0].bullets, [original])
assert.deepEqual(doc.experience[0].bullets, [original, added], 'Review must not mutate saved historical content')
assert.equal(needsClaimReview({ ...report, auto_applied: false }), false)
assert.equal(needsClaimReview(null), false)
const staleGaps = { gaps: [{ term: 'CONVAL', kind: 'tool' }, { term: 'DHA', kind: 'licence' }] }
assert.deepEqual(gapTermsFromMatchReport(staleGaps, undefined, doc).map((x) => x.term), ['DHA'], 'Confirmed saved CV evidence must reconcile stale gaps')
assert.equal(gapTermsFromMatchReport(staleGaps).length, 2)
const contradictory = "The job asks for CONVAL. Your profile doesn’t mention CONVAL. What is your closest experience?"
const target = { target: { keywords: [{ term: 'CONVAL', aliases: [] }] } }
assert.equal(contradictsSavedCv(contradictory, doc, target), true)
assert.equal(contradictsSavedCv('Explain your approach to CONVAL calculations.', doc, target), false)
const negativeDoc = { ...doc, experience: [{ ...doc.experience[0], bullets: ['No experience with CONVAL.'] }] }
assert.equal(contradictsSavedCv(contradictory, negativeDoc, target), false)
assert.equal(gapTermsFromMatchReport(staleGaps, undefined, negativeDoc).length, 2, 'A negative CV mention must not erase a real gap')


const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
} })
saveHandoff({ answers: { hasGulfExperience: false, hasProfessionalExperience: true }, result: {} as never, resumeText: 'Private candidate CV' })
assert.ok(readHandoff())
const saved = JSON.parse(storage.get(HANDOFF_KEY)!)
for (const createdAt of [new Date(Date.now() - HANDOFF_TTL_MS - 1).toISOString(), 'bad date', new Date(Date.now() + 60000).toISOString()]) {
  storage.set(HANDOFF_KEY, JSON.stringify({ ...saved, createdAt }))
  assert.equal(readHandoff(), null)
  assert.equal(storage.has(HANDOFF_KEY), false, 'Expired or invalid candidate text must be removed')
}
storage.set(HANDOFF_KEY, '{broken')
assert.equal(readHandoff(), null)
assert.equal(storage.has(HANDOFF_KEY), false)
console.log('PASS: audit negatives, explicit statuses, optional photo, legacy claim review, consistent saved evidence and four-hour handoff expiry')

async function checkBuildSafety() {
  const { profile } = makeTemplateFixture()
  const role = profile.work_experience[0]
  const previousWriter = writer.writeV3
  const mutable = writer as { writeV3: typeof writer.writeV3 }
  mutable.writeV3 = async () => ({
    level: 'high', summary: '', summaryKeptOriginal: true, summaryAdded: [],
    jobs: [{ id: role.id, keptOriginal: false, droppedNew: [], bullets: [
      { text: original, isNew: false }, { text: added, isNew: true },
    ] }], skillsOrder: profile.skills.map((x) => x.name), ms: 1,
    inputTokens: 0, outputTokens: 0, caught: [],
  })
  try {
    const result = await buildV3({ profile,
      target: { target_job_title: 'Instrumentation Engineer', target_country: 'saudi_arabia', target_company: null, target_industry: null },
      level: 'high', selectedBlocks: { summary: false, experienceIds: [role.id] },
      jobDescription: 'Control valve calculations with CONVAL', analysisId: null,
      analysis: { jobField: 'instrumentation', candidateField: 'instrumentation', fieldMatch: 'same', ms: 1, inputTokens: 0, outputTokens: 0,
        requirements: [{ term: 'CONVAL', importance: 'must', kind: 'tool', group: 'C', location: null, quote: null }] },
      autoApply: true, route: 'offline-audit-test',
    })
    assert.ok(result.ok)
    if (!result.ok) return
    assert.equal(result.report.suggestions?.[0].status, 'pending', 'Even a prior consent must not confirm a new generated claim')
    assert.equal(result.report.auto_applied, false)
    assert.equal(result.stats.autoApplied, false)
    assert.ok(!result.documentSnapshot.experience.find((x) => x.entry.id === role.id)?.bullets.includes(added))
    console.log('PASS: actual v3 build keeps new facts out of exportable CV despite prior consent')
  } finally { mutable.writeV3 = previousWriter }
}
void checkBuildSafety().catch((e) => { console.error(e); process.exitCode = 1 })
