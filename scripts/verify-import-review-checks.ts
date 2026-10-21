import './resolve-paths'
import assert from 'node:assert/strict'
import { resumeReviewChecks, type ReviewCheckEditor } from '../lib/resumeParse/reviewChecks'
import { currentRoleFingerprint,type ImportReview } from '../lib/resumeParse/importReview'
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
console.log('PASS review checks: valid/invalid fields, all issues, impossible/reversed dates, uncertain extraction, optional data and fresher safeguards')
