/**
 * Every CV is built newest first (founder, 2026-10-02): jobs, certificates and
 * degrees with the latest date on top. The CV editor can still move entries.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-resume-order.ts
 */

import './resolve-paths'
import { sortCertificationsNewestFirst, sortEducationNewestFirst, sortExperienceNewestFirst } from '../lib/resumeOrder'
import { buildResumeDocument } from '../lib/resumeDocument'
import type { CareerProfileFull } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean, got?: unknown) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    failures++
    console.log(`  FAIL  ${name}${got === undefined ? '' : ' — got ' + JSON.stringify(got)}`)
  }
}
const ids = (xs: Array<{ id: string }>) => xs.map((x) => x.id).join(',')

console.log('work experience')
// Saved in a random order, as an upload or manual entry can leave it.
const jobs = [
  { id: 'kuwait-2018', start_date: '2018-03-01', end_date: '2020-04-30', sort_order: 0 },
  { id: 'current-2024', start_date: '2024-08-01', end_date: null, sort_order: 1 },
  { id: 'manila-2020', start_date: '2020-04-01', end_date: '2023-12-31', sort_order: 2 },
  { id: 'nodates', start_date: '', end_date: null, sort_order: 3 },
  { id: 'abudhabi-2023', start_date: '2023-12-01', end_date: '2024-06-30', sort_order: 4 },
]
check('current job first, then by end date, undated last', ids(sortExperienceNewestFirst(jobs)) === 'current-2024,abudhabi-2023,manila-2020,kuwait-2018,nodates', ids(sortExperienceNewestFirst(jobs)))
const twoCurrent = [
  { id: 'side-2019', start_date: '2019-01-01', end_date: null, sort_order: 0 },
  { id: 'main-2022', start_date: '2022-05-01', end_date: null, sort_order: 1 },
]
check('two current jobs: latest start first', ids(sortExperienceNewestFirst(twoCurrent)) === 'main-2022,side-2019')
const sameEnd = [
  { id: 'b', start_date: '2015-01-01', end_date: '2020-01-31', sort_order: 0 },
  { id: 'a', start_date: '2018-01-01', end_date: '2020-01-31', sort_order: 1 },
]
check('same end date: later start first', ids(sortExperienceNewestFirst(sameEnd)) === 'a,b')
const exactTie = [
  { id: 'first', start_date: '2020-01', end_date: '2021-01', sort_order: 0 },
  { id: 'second', start_date: '2020-01', end_date: '2021-01', sort_order: 1 },
]
check('exact tie keeps the user\'s order', ids(sortExperienceNewestFirst(exactTie)) === 'first,second')
check('month-only dates work', ids(sortExperienceNewestFirst([{ id: 'old', start_date: '2019-02', end_date: '2019-09', sort_order: 0 }, { id: 'new', start_date: '2021', end_date: '2022-3', sort_order: 1 }])) === 'new,old')

console.log('certifications')
const certs = [
  { id: 'osha-2016', issue_date: '2016-05-01', sort_order: 0 },
  { id: 'nodate', issue_date: null, sort_order: 1 },
  { id: 'pmp-2023', issue_date: '2023-02-10', sort_order: 2 },
  { id: 'cscs-2019', issue_date: '2019-11-01', sort_order: 3 },
]
check('latest issue date first, undated last', ids(sortCertificationsNewestFirst(certs)) === 'pmp-2023,cscs-2019,osha-2016,nodate', ids(sortCertificationsNewestFirst(certs)))

console.log('education')
const edu = [
  { id: 'diploma-2010', start_year: 2007, end_year: 2010, sort_order: 0 },
  { id: 'masters-2026', start_year: 2024, end_year: 2026, sort_order: 1 },
  { id: 'school', start_year: null, end_year: null, sort_order: 2 },
  { id: 'bachelor-2014', start_year: 2010, end_year: null, sort_order: 3 },
]
check('latest year first (start year when no end), undated last', ids(sortEducationNewestFirst(edu)) === 'masters-2026,bachelor-2014,diploma-2010,school', ids(sortEducationNewestFirst(edu)))

console.log('the CV document')
const profile = {
  id: 'p', user_id: 'u', full_name: 'Test', professional_summary: '',
  work_experience: jobs.map((j) => ({ ...j, profile_id: 'p', role: j.id, company: 'Co', location: null, description: null, highlights: [], created_at: '' })),
  certifications: certs.map((c) => ({ ...c, profile_id: 'p', name: c.id, issuer: null, expiry_date: null, credential_id: null, created_at: '' })),
  education: edu.map((e) => ({ ...e, profile_id: 'p', degree: e.id, field_of_study: null, institution: 'Uni', created_at: '' })),
  skills: [], additional_information: [], languages: [],
} as unknown as CareerProfileFull
const doc = buildResumeDocument({ profile, optimizedContent: { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] } as never, skillsOrder: [], fieldVisibility: null, targetJobTitle: 'X' })
check('CV jobs newest first', doc.experience.map((x) => x.entry.id).join(',') === 'current-2024,abudhabi-2023,manila-2020,kuwait-2018,nodates', doc.experience.map((x) => x.entry.id))
check('CV certificates newest first', doc.certifications.map((x) => x.entry.id)[0] === 'pmp-2023')
check('CV education newest first', doc.education.map((x) => x.entry.id)[0] === 'masters-2026')

console.log('driving licence on the CV')
const lic = buildResumeDocument({ profile: { ...profile, has_driving_license: true, driving_license_country: 'UAE', driving_license_category: 'Light vehicle' } as CareerProfileFull, optimizedContent: { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] } as never, skillsOrder: [], fieldVisibility: null, targetJobTitle: 'X' })
check('licence listed with the certificates', lic.certifications.some((c) => c.display === 'UAE Driving Licence (Light vehicle)'), lic.certifications.map((c) => c.display))
check('no licence line when the profile says no', !doc.certifications.some((c) => /Driving/.test(c.display)))
const dup = buildResumeDocument({ profile: { ...profile, has_driving_license: true, driving_license_country: 'UAE', certifications: [{ id: 'x', profile_id: 'p', name: 'UAE Driving License', issuer: null, issue_date: null, expiry_date: null, sort_order: 0, created_at: '' }] } as unknown as CareerProfileFull, optimizedContent: { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] } as never, skillsOrder: [], fieldVisibility: null, targetJobTitle: 'X' })
check('not listed twice when a certificate already names it', dup.certifications.filter((c) => /Driving/i.test(c.display)).length === 1)

console.log('visa transfer on the CV (launch audit: not answered must print nothing)')
const visaDoc = (v: boolean | null) => buildResumeDocument({ profile: { ...profile, visa_transferable: v } as CareerProfileFull, optimizedContent: { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] } as never, skillsOrder: [], fieldVisibility: null, targetJobTitle: 'X' })
const line = (d: ReturnType<typeof visaDoc>) => [d.header.identityPrimary, d.header.identityGulf].join(' ')
check('not answered: nothing about visa transfer', !/transfer/i.test(line(visaDoc(null))), line(visaDoc(null)))
check('answered yes: shown', /Transferable visa/.test(line(visaDoc(true))))
check('answered no: shown only because the user chose it', /not transferable/.test(line(visaDoc(false))))

if (failures) {
  console.log(`\n${failures} failed`)
  process.exit(1)
}
console.log('\nall passed')
