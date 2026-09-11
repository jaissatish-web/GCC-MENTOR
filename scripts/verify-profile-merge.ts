/**
 * Assertions for "Add it to my profile" — merging a new CV into an existing
 * Career Profile (lib/profileMerge.ts).
 *
 *   npx tsx scripts/verify-profile-merge.ts
 *
 * WHY THIS EXISTS (2026-09-11). The merge keyed rows on column names that do
 * not exist (`job_title`, `company_name`, `skill_name`, `certification_name`),
 * so every new job, skill and certification keyed as blank and was skipped as
 * noise. The screen promised "Adds N new entries"; the save carried none of
 * the jobs. Nothing tested it, so it shipped and stayed. These assertions use
 * the real field names the draft, the editor and the database all share.
 */

import './resolve-paths'
import { mergeDraftIntoProfile, describeReplaceLosses } from '../lib/profileMerge'
import type { CareerProfileDraft, CareerProfileFull } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

type AnyRow = Record<string, unknown>

const existing = {
  id: 'p1',
  user_id: 'u1',
  full_name: 'Test Engineer',
  phone: '+91 90000 00000',
  email: 'test@example.com',
  visa_status: 'Employment visa',
  current_location: '',
  work_experience: [
    { id: 'w1', profile_id: 'p1', company: 'Acme Engineering', role: 'Piping Engineer', start_date: '2008-03-01', end_date: '2013-12-01', sort_order: 0 },
  ],
  skills: [{ id: 's1', profile_id: 'p1', name: 'AutoCAD', sort_order: 0 }],
  certifications: [{ id: 'c1', profile_id: 'p1', name: 'NEBOSH IGC', issuer: null, sort_order: 0 }],
  education: [{ id: 'e1', profile_id: 'p1', degree: 'B.Tech Mechanical Engineering', institution: 'Anna University', sort_order: 0 }],
  additional_information: [],
} as unknown as CareerProfileFull

const draft = {
  full_name: 'Someone Else',
  current_location: 'Abu Dhabi, UAE',
  work_experience: [
    { company: 'Al Mansoori Engineering', role: 'Senior Piping Engineer', start_date: '2020-01', sort_order: 1 },
    { company: 'Saudi Industrial Services', role: 'Piping Engineer', start_date: '2014-03', sort_order: 2 },
    // The job the profile already has — different case and spacing.
    { company: '  ACME   engineering ', role: 'piping engineer', start_date: '2008-03', sort_order: 3 },
    // Extraction noise: no company, no role.
    { company: '', role: '', sort_order: 4 },
  ],
  skills: [{ name: 'CAESAR II', sort_order: 1 }, { name: 'autocad', sort_order: 2 }],
  certifications: [{ name: 'ASNT Level II', sort_order: 1 }, { name: 'nebosh  igc', sort_order: 2 }],
  education: [{ degree: 'B.Tech Mechanical Engineering', institution: 'Anna University', sort_order: 1 }],
  additional_information: [{ label: 'Languages', value: 'English, Hindi', sort_order: 1 }],
} as unknown as CareerProfileDraft

const m = mergeDraftIntoProfile(existing, draft)
const jobs = m.profile.work_experience as unknown as AnyRow[]
const companies = jobs.map((w) => w.company)

console.log('\nNew entries are added — the bug this file exists for')
check('both new jobs are added', companies.includes('Al Mansoori Engineering') && companies.includes('Saudi Industrial Services'))
check('a new skill is added', (m.profile.skills as unknown as AnyRow[]).some((s) => s.name === 'CAESAR II'))
check('a new certification is added', (m.profile.certifications as unknown as AnyRow[]).some((c) => c.name === 'ASNT Level II'))
check('new additional information is added', (m.profile.additional_information as unknown as AnyRow[]).length === 1)
check(
  'the counts the screen shows match what was added',
  m.added.work_experience === 2 && m.added.skills === 1 && m.added.certifications === 1 &&
    m.added.education === 0 && m.added.additional_information === 1,
)

console.log('\nNothing is duplicated, deleted or overwritten')
check('the same job, differently cased and spaced, is not added twice', jobs.length === 3)
check('a job with no company and no role is skipped as noise', !companies.includes(''))
check('the same skill in a different case is not added twice', (m.profile.skills as unknown as AnyRow[]).length === 2)
check('the same certification is not added twice', (m.profile.certifications as unknown as AnyRow[]).length === 2)
check('the same education is not added twice', (m.profile.education as unknown as AnyRow[]).length === 1)
check('an existing job keeps its id', jobs.find((w) => w.company === 'Acme Engineering')?.id === 'w1')
check('new rows carry no id, so the save inserts them', jobs.filter((w) => w.company !== 'Acme Engineering').every((w) => w.id === undefined))
check('a field the user already filled is never overwritten', m.profile.full_name === 'Test Engineer')
check('an empty field is filled from the CV', m.profile.current_location === 'Abu Dhabi, UAE' && m.filledFields.includes('current_location'))

console.log('\nWhat a Replace would remove is counted on the same keys')
const replaceSame = describeReplaceLosses(existing, draft)
check('a CV containing every existing entry loses none of them', Object.values(replaceSame.entries).every((n) => n === 0))
const draftWithoutAcme = {
  ...draft,
  work_experience: (draft.work_experience as unknown as AnyRow[]).slice(0, 2),
} as unknown as CareerProfileDraft
check('a CV without an existing job counts that job as lost', describeReplaceLosses(existing, draftWithoutAcme).entries.work_experience === 1)
const licenced = { ...existing, has_driving_license: true } as unknown as CareerProfileFull
check(
  'a driving-licence answer a CV cannot supply is named as lost (it read a DOM id before)',
  describeReplaceLosses(licenced, draft).fields.includes('Driving licence'),
)
check(
  'and a field the user never answered is not',
  !describeReplaceLosses(existing, draft).fields.includes('Driving licence'),
)

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
