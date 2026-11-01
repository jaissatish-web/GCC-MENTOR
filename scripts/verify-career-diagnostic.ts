import './resolve-paths'
import assert from 'node:assert/strict'
import { buildCareerDiagnostic, inferProfession, type DiagnosticProfile } from '../lib/resumeParse/careerDiagnostic'
import type { ImportReview } from '../lib/resumeParse/importReview'
const review: ImportReview = { version: 1, id: 'synthetic', createdAt: '', sourceText: 'Example source text', changes: [], imported: { roles: 0, skills: 0, qualifications: 0, certificates: 0 }, wordingStatus: 'not_needed' }
const blank: DiagnosticProfile = { full_name: 'Example Person', email: 'example@example.com', phone: '+919876543210', current_location: 'India', work_experience: [], skills: [], education: [], certifications: [] }
const examples = [
  ['Instrumentation Engineer', 'engineering', 'Saudi Arabia'], ['Registered Nurse', 'healthcare', 'UK'], ['Accountant', 'finance', 'UAE'], ['Truck Driver', 'driving', 'US'], ['Software Developer', 'technology', 'India'], ['Hotel Manager', 'hospitality', 'Bahrain'], ['HR Manager', 'management', 'Canada'], ['Teacher', 'education', 'Australia'], ['Graphic Designer', 'neutral', 'Kenya'],
] as const
for (const [role, profession, location] of examples) {
  const profile: DiagnosticProfile = { ...blank, current_location: location, work_experience: [{ company: 'Example Employer', role, start_date: '2020-02', end_date: '2022-04', description: 'Actual responsibilities.' }], skills: [{ name: 'Actual skill' }] }
  const model = buildCareerDiagnostic(profile, review)
  assert.equal(model.profession, profession)
  assert.equal(model.location, location)
  assert.equal(model.snapshot.employers, 1)
  assert.equal(model.timeline[0].months, 26)
  assert.ok(!model.findings.length, 'clean profiles should not acquire artificial issues')
  assert.ok(!model.coverage.some(item => item.id === 'training'), 'no irrelevant certificate completeness requirement')
}
const graduate = buildCareerDiagnostic({ ...blank, education: [{ degree: 'Diploma', institution: 'Example Institute' }] }, review)
assert.ok(!graduate.coverage.some(item => item.id === 'experience'), 'no invented employment requirement for a graduate')
assert.equal(graduate.coverage.find(item => item.id === 'education')?.captured, 2)
const contact = graduate.coverage.find(item => item.id === 'contact')!
assert.equal(contact.captured, 4)
assert.equal(contact.applicable, 4)
const uncertain = buildCareerDiagnostic({ ...blank, work_experience: [{ company: 'Example', role: 'Consultant', start_date: '2020', end_date_unconfirmed: true }] }, review)
assert.equal(uncertain.timeline[0].months, null, 'year-only/unknown end must not invent duration')
assert.ok(uncertain.timeline[0].dates.includes('not confirmed'))
assert.equal(uncertain.coverage.find(item => item.id === 'experience')?.captured, 3, 'unknown current status is not captured')
const freelance = buildCareerDiagnostic({ ...blank, work_experience: [{ company: 'Self-employed', role: 'Designer', start_date: '2020-01', end_date: '2022-12' }, { company: 'Client work', role: 'Consultant', start_date: '2021-03', end_date: '2023-01' }] }, review)
assert.equal(freelance.findings.length, 1)
assert.match(freelance.findings[0].correction, /Keep accurate overlapping dates/)
const reversed = buildCareerDiagnostic({ ...blank, work_experience: [{ start_date: '2023-01', end_date: '2022-01' }] }, review)
assert.equal(reversed.timeline[0].months, null, 'reversed dates never produce negative experience')
const recovered = buildCareerDiagnostic(blank, { ...review, changes: [{ id: 'recovered-email', field: 'email', kind: 'format', label: 'Email', before: 'Missed in the first reading', after: 'example@example.com', reason: 'Recovered from source.' }] })
assert.equal(recovered.findings[0].kind, 'extraction_failure')
assert.equal(recovered.findings[0].repaired, true)
const emptySource = buildCareerDiagnostic(blank, { ...review, sourceText: '' })
assert.ok(!emptySource.findings.some(item => item.kind === 'extraction_failure'), 'unavailable source is not proof of parser failure')
const intent = buildCareerDiagnostic({ ...blank, target_job_title: 'Director' }, review)
assert.equal(intent.title, '', 'target aspiration is not extracted professional title')
const invalidDay = buildCareerDiagnostic({ ...blank, work_experience: [{ start_date: '2020-02-31', end_date: '2021-03-01' }] }, review)
assert.equal(invalidDay.timeline[0].months, null, 'impossible full dates are not treated as known months')
const ownHeadline = buildCareerDiagnostic({ ...blank, professional_headline: 'Registered Nurse', work_experience: [{ role: 'Manager' }] }, review)
assert.equal(ownHeadline.profession, 'healthcare', 'actual professional headline takes precedence over role-order fallback')
assert.equal(inferProfession('IT Specialist'), 'technology')
assert.equal(inferProfession('Clinical Nurse Manager'), 'healthcare')
const unsupported = buildCareerDiagnostic(blank, review, [{ id: 'missing-phone', field: 'phone', category: 'contact', title: 'Phone', value: '', reason: 'Not recorded.', status: 'attention' }])
assert.equal(unsupported.findings[0].kind, 'missing_unclear', 'missing profile data is not a claimed ATS rejection')
assert.equal(unsupported.findings[0].section, 'contact')
const gapProfile: DiagnosticProfile = { ...blank, work_experience: [{ company: 'Example A', role: 'Analyst', start_date: '2018-01', end_date: '2020-03' }, { company: 'Example B', role: 'Analyst', start_date: '2020-08', end_date: '2022-01' }] }
const gap = buildCareerDiagnostic(gapProfile, review).findings.find(item => item.id.startsWith('timeline-gap:'))!
assert.ok(gap)
assert.equal(gap.severity, 'review')
assert.match(gap.why, /Continuous employment is not required/)
assert.match(gap.evidence!, /2020-03.*2020-08/)
assert.ok(!buildCareerDiagnostic({ ...gapProfile, work_experience: [...gapProfile.work_experience, { role: 'Freelancer', start_date: '2019', end_date_unconfirmed: true }] }, review).findings.some(item => item.id.startsWith('timeline-gap:')), 'an uncertain role could cover an apparent gap')
assert.ok(!buildCareerDiagnostic({ ...gapProfile, work_experience: [{ ...gapProfile.work_experience[0], end_date: '2020' }, gapProfile.work_experience[1]] }, review).findings.some(item => item.id.startsWith('timeline-gap:')), 'year-only boundaries cannot establish a gap')
assert.ok(!buildCareerDiagnostic({ ...gapProfile, work_experience: [{ ...gapProfile.work_experience[0], end_date: '2020-07' }, gapProfile.work_experience[1]] }, review).findings.some(item => item.id.startsWith('timeline-gap:')), 'adjacent recorded months leave no known whole-month gap')
assert.ok(!buildCareerDiagnostic({ ...gapProfile, work_experience: [...gapProfile.work_experience, { role: 'Consultant', start_date: '2019-01', end_date: '2021-01' }] }, review).findings.some(item => item.id.startsWith('timeline-gap:')), 'unioned overlapping intervals cover the gap')
assert.ok(!buildCareerDiagnostic({ ...gapProfile, work_experience: [{ ...gapProfile.work_experience[0], end_date: null, end_date_unconfirmed: false }, gapProfile.work_experience[1]] }, review).findings.some(item => item.id.startsWith('timeline-gap:')), 'explicit current interval covers later time without inventing today as an end')
assert.equal(buildCareerDiagnostic({ ...blank, professional_headline: 'Nurse Manager' }, review).title, 'Nurse Manager', 'actual supplied title is preserved without an invented seniority')
console.log('PASS universal career diagnostics: professions/countries, real coverage, graduates/freelancers, uncertain and reversed dates, overlaps, recovered extraction evidence and neutral unsupported claims')
