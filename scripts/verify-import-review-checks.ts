import './resolve-paths'
import assert from 'node:assert/strict'
import { resumeReviewChecks, type ReviewCheckEditor } from '../lib/resumeParse/reviewChecks'
import { currentRoleFingerprint,type ImportReview } from '../lib/resumeParse/importReview'
import { importReviewPlan } from '../lib/resumeParse/reviewPlan'
import { validProfileLinkedIn } from '../lib/profileFieldValidity'
const review: ImportReview = { version: 1, id: 'test', createdAt: '', sourceText: '', changes: [], imported: { roles: 1, skills: 1, qualifications: 0, certificates: 0 }, wordingStatus: 'not_needed' }
const editor: ReviewCheckEditor = { full_name: 'Example Person', email: 'person@example.com', phone: '+919876543210', professional_summary: 'Engineer.', skills: [{ name: 'DCS' }], work_experience: [{ company: 'Example', role: 'Engineer', start_date: '2020-01', end_date: '', description: 'Commissioned control systems.', highlights: '' }] }
review.currentRoles=[currentRoleFingerprint(editor.work_experience[0])]
const checks = (value = editor, r = review) => resumeReviewChecks(r, value, () => null)
assert.equal(checks().filter(c => c.status === 'attention').length, 0, 'clean CV must not invent issues')
const invalid = checks({ ...editor, full_name: '', email: 'bad@email', phone: 'abc123', skills: [], work_experience: [{ ...editor.work_experience[0], start_date: '2020-02-31', role: '', company: '', description: '' }] })
assert.ok(invalid.filter(c => c.status === 'attention').length > 3, 'all issues appear, not only the previous shortlist')
assert.ok(invalid.filter(c => c.status === 'attention').every(c => !c.confirmable), 'invalid facts cannot be bypassed with confirmation')
assert.equal(checks({ ...editor, work_experience: [] }).filter(c => c.category === 'employment').length, 0, 'freshers are not required to invent jobs')
assert.ok(checks({ ...editor, work_experience: [{ ...editor.work_experience[0], start_date: '2022', end_date: '2021' }] }).some(c => c.field.endsWith('date_order') && c.status === 'attention'))
const warning = { id: 'warn', kind: 'check' as const, field: 'work_experience.0.company', label: 'Please verify', before: '', after: '', reason: 'Company not matched to source text.' }
const warned = checks(editor, { ...review, changes: [warning] })
assert.equal(warned.filter(c => c.field === warning.field).length, 1, 'deduplicate warning against field check')
assert.ok(warned.some(c => c.field === warning.field && c.status === 'attention' && c.confirmable), 'well-formed but uncertain extraction requires user confirmation')
assert.ok(!checks({ ...editor, work_experience: [{ ...editor.work_experience[0], company: '' }] }, { ...review, changes: [warning] }).find(c => c.field === warning.field)?.confirmable)
assert.ok(checks(editor, { ...review, changes: [{ ...warning, field: 'date_of_birth' }] }).some(c => c.confirmable && !c.value), 'optional missing source detail can be explicitly marked not applicable')
assert.equal(checks({ ...editor, education: [{ degree: 'B.Tech', institution: 'Example', start_year: '2014', end_year: '2012' }] }).find(c => c.field === 'education.0.date_order')?.status, 'attention')
const suggestion = { ...warning, kind: 'wording' as const, field: 'professional_summary', suggested: true, restorable: true, before: 'Engineer.', after: 'An engineer.' }
assert.equal(checks(editor, { ...review, changes: [suggestion] }).find(c => c.change)?.status, 'optional', 'optional wording must not count as invalid data')
for (const address of ['https://www.linkedin.com/in/example-person', 'linkedin.com/in/example-person', 'uk.linkedin.com/in/example-person']) {
  assert.equal(validProfileLinkedIn(address), true, 'Copied LinkedIn profile address is recognized without changing it')
  assert.equal(checks({ ...editor, linkedin_url: address }).find(c => c.field === 'linkedin_url')?.status, 'passed')
}
for (const address of ['wrong address', 'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'https://linkedin.com.evil.test/in/example', 'https://linkedin.com@evil.test/in/example']) {
  const input = { ...editor, linkedin_url: address }
  const before = JSON.stringify(input)
  const checked = checks(input)
  const check = checked.find(c => c.field === 'linkedin_url')!
  assert.equal(validProfileLinkedIn(address), false)
  assert.equal(check.status, 'attention', 'Malformed optional LinkedIn remains a visible warning')
  assert.equal(check.blocking, false, 'LinkedIn attention is explicitly non-blocking')
  assert.equal(check.confirmable, undefined, 'Malformed text cannot be falsely confirmed valid')
  const plan = importReviewPlan(checked, {})
  assert.equal(plan.invalid.length, 0, 'LinkedIn alone must never block a profile save')
  assert.equal(plan.blocking.length, 0)
  assert.ok(plan.outstanding.includes(check) && plan.later.includes(check), 'Optional warning stays visible after allowing save')
  assert.equal(importReviewPlan(checked, { [check.id]: check.value }).outstanding.includes(check), true, 'A confirmation cannot hide a malformed address')
  assert.equal(JSON.stringify(input), before, 'Address validation never rewrites supplied facts')
}
const linkedInSourceNote = checks({ ...editor, linkedin_url: '' }, { ...review, changes: [{ ...warning, field: 'linkedin_url' }] })
assert.equal(linkedInSourceNote.find(c => c.field === 'linkedin_url')?.blocking, false, 'Optional LinkedIn extraction notes do not become required facts')
assert.equal(importReviewPlan(linkedInSourceNote, {}).blocking.length, 0)
const badRequiredAlongsideLinkedIn = importReviewPlan(checks({ ...editor, email: 'invalid email', linkedin_url: 'wrong address' }), {})
assert.deepEqual(badRequiredAlongsideLinkedIn.invalid.map(c => c.field), ['email'], 'Optional LinkedIn exception must not weaken other invalid-field checks')
console.log('PASS review checks: valid/invalid fields, all issues, impossible/reversed dates, uncertain extraction, optional data and fresher safeguards')
console.log('PASS LinkedIn advisory: copied addresses, malicious/spoofed strings, unchanged inputs, visible non-blocking warnings and required-field protection')
