import './resolve-paths'
import assert from 'node:assert/strict'
import { buildImportReview, addWordingSuggestions, safeWording, redactImportText } from '../lib/resumeParse/importReview'
import { currentImportValue, applyImportChange } from '../lib/resumeParse/reviewEditor'
import { importAttention } from '../lib/resumeParse/importAttention'
import { checkDraft } from '../lib/resumeParse/check'
import { prepass } from '../lib/resumeParse/prepass'
import type { CareerProfileDraft } from '../types/careerProfile'

const text = 'Satish\nsatish@example.com\nPhone: +919876543210\nWork Experience\nACME | Engineer | Mar 2019 - Present\nMaintanance of DCS systems for 3 units.\nSkills\nDCS\nPassport: x1234567\nEducation\nB.Tech, 2012'
const raw: CareerProfileDraft = { professional_summary: 'Engineer with experiance in DCS.', work_experience: [{ company: 'ACME', role: 'Engineer', start_date: 'Mar 2019', end_date: 'Present', highlights: ['Maintanance of DCS systems for 3 units.'], sort_order: 1 }], skills: [{ name: 'DCS', sort_order: 1 }, { name: 'DCS', sort_order: 2 }, { name: 'Python', sort_order: 3 }], education: [], certifications: [], additional_information: [] }
const checked = checkDraft(raw, text, prepass(text))
const review = buildImportReview(raw, checked.draft, text, checked.warnings)
assert.equal(checked.draft.work_experience[0].highlights?.[0], 'Maintenance of DCS systems for 3 units.')
assert.equal(checked.draft.professional_summary, raw.professional_summary, 'summary remains source text until explicit approval')
assert.equal(review.changes.filter(c => c.kind === 'duplicate').length, 1)
assert.ok(review.changes.find(c => c.kind === 'format' && c.before === 'Mar 2019' && c.after === '2019-03'))
assert.ok(!review.sourceText.includes('x1234567'))
assert.equal(redactImportText('PAN card: ABCDE1234F'), 'PAN card: [number removed]')
assert.equal(redactImportText('Aadhaar: 1234 5678 9012'), 'Aadhaar: [number removed]')
assert.equal(redactImportText('Passport number:\nx1234567'), 'Passport number:\n[number removed]')
assert.equal(redactImportText('Iqama: 1234567890'), 'Iqama: [number removed]')
assert.ok(safeWording('Responsible for testing and commission of instruments.', 'Responsible for testing and commissioning instruments.'))
for (const bad of ['Led commissioning of instruments.', 'Responsible for testing and commissioning 500 instruments.', 'Responsible for testing and commissioning PLC instruments.', 'Not responsible for testing instruments.']) assert.ok(!safeWording('Responsible for testing instruments.', bad))
addWordingSuggestions(review, checked.draft, { changes: [{ field: 'work_experience.0.highlights.0', after: 'Managed a team of 50 engineers.' }, { field: 'full_name', after: 'Someone Else' }] })
assert.ok(!review.changes.some(c => c.after.includes('50 engineers')))
const change = review.changes.find(c => c.kind === 'spelling' && c.job)!
const editor = { professional_summary: raw.professional_summary!, skills: [{ key: 's', name: 'DCS' }], work_experience: [{ company: 'ACME', role: 'Engineer', start_date: '2019-03', description: '', highlights: change.after }] }
assert.equal(currentImportValue(editor, change), change.after)
const restored = applyImportChange(editor, change, change.before, () => 'new')
assert.equal(restored.work_experience[0].highlights, change.before)
assert.equal(editor.work_experience[0].highlights, change.after, 'immutable update')
const custom = { ...editor, work_experience: [{ ...editor.work_experience[0], highlights: 'User edited this responsibility.' }] }
assert.equal(applyImportChange(custom, change, change.before, () => 'new'), custom, 'later edits preserved')
const ambiguous = { ...editor, work_experience: [...editor.work_experience, ...editor.work_experience] }
assert.equal(currentImportValue(ambiguous, change), null, 'ambiguous role refused')
const duplicate = review.changes.find(c => c.kind === 'duplicate')!
const withRepeat = applyImportChange(editor, duplicate, duplicate.before, () => 'new')
assert.equal(withRepeat.skills.length, 2)
assert.equal(applyImportChange(withRepeat, duplicate, duplicate.before, () => 'new'), withRepeat)
const completeEditor = { ...editor, full_name: 'Test Person', email: 'test@example.com', phone: '+919876543210', professional_summary: 'Engineer with experience in DCS.' }
assert.deepEqual(importAttention(review, completeEditor), [], 'clean current data must not produce invented problems')
const missing = importAttention(review, { ...completeEditor, email: '', phone: '', professional_summary: '' })
assert.equal(missing.length, 3)
assert.deepEqual(missing.slice(0, 2).map(item => item.field), ['email', 'phone'], 'contact gaps take priority')
assert.ok(missing.every(item => !item.change), 'missing career facts cannot be automatically invented')
const pendingCorrection = importAttention(review, { ...completeEditor, professional_summary: raw.professional_summary! })
assert.equal(pendingCorrection.length, 1)
assert.equal(pendingCorrection[0].change?.before, raw.professional_summary)
assert.equal(importAttention(review, { ...completeEditor, professional_summary: 'My own corrected summary.' }).length, 0, 'manual edits clear pending suggestions')
const restoredAttention = importAttention(review, { ...restored, full_name: 'Test Person', email: 'test@example.com', phone: '+919876543210', professional_summary: completeEditor.professional_summary })
assert.equal(restoredAttention[0].change?.id, change.id, 'restored spelling is actionable again')
assert.ok(!importAttention(review, { ...completeEditor, work_experience: [] }).some(item => item.field.startsWith('work_experience')), 'freshers need no invented job history')
assert.equal(importAttention(review, { ...completeEditor, email: '', phone: '', full_name: '', professional_summary: '', skills: [] }).length, 3, 'shortlist is limited to three real issues')
console.log('PASS import review: factual safeguards, privacy masking, audit evidence, restore, stale edits and duplicate protection')
