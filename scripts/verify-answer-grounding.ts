/**
 * Assertions for the interview-answer number check (review finding X01).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-answer-grounding.ts
 *
 * Synthetic profile only — never a real CV.
 */

import './resolve-paths'
import {
  allowedNumbersFor,
  derivedExperienceYears,
  extractNumbers,
  unsourcedNumbers,
} from '../lib/ai/answerGrounding'
import type { CareerProfileFull } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const profile = {
  full_name: 'Synthetic Candidate',
  professional_summary: 'Piping engineer with 9+ years across refinery projects.',
  notice_period: '30 days',
  work_experience: [
    {
      id: 'w1', company: 'Gulf Refining', role: 'Senior Piping Engineer', location: 'Jubail, Saudi Arabia',
      start_date: '2019-03-01', end_date: null, sort_order: 0,
      highlights: ['Supervised 14 designers on a 250,000 bpd crude unit', 'Cut isometric rework by 18%'],
    },
    {
      id: 'w2', company: 'Delta EPC', role: 'Piping Engineer', location: 'Mumbai, India',
      start_date: '2016-01-01', end_date: '2019-02-01', sort_order: 1, highlights: [],
    },
  ],
  skills: [{ id: 's1', name: 'ASME B31.3', sort_order: 0 }, { id: 's2', name: 'CAESAR II', sort_order: 1 }],
  certifications: [{ id: 'c1', name: 'ISO 45001 Lead Auditor', issuer: null, issue_date: '2021-05-01', expiry_date: null, sort_order: 0 }],
  education: [{ id: 'e1', degree: 'B.Tech', institution: 'Synthetic University', field_of_study: 'Mechanical', start_year: 2011, end_year: 2015, sort_order: 0 }],
  additional_information: [],
} as unknown as CareerProfileFull

const now = new Date('2026-09-15T00:00:00Z')
const allowed = allowedNumbersFor(profile, ['Job advert: minimum 8 years, Aramco SAES-L-310'], now)

console.log('\nNumber extraction')
check('thousands separators are normalised', extractNumbers('a 250,000 bpd unit').includes('250000'))
check('standards keep their decimal', extractNumbers('ASME B31.3').includes('31.3'))
check('trailing .0 is dropped', extractNumbers('3.0 years')[0] === '3')

console.log('\nGrounded answers pass')
check('a highlight number', unsourcedNumbers('I supervised 14 designers.', allowed).length === 0)
check('a percentage from the profile', unsourcedNumbers('We cut rework by 18%.', allowed).length === 0)
check('a standard from skills', unsourcedNumbers('I design to ASME B31.3.', allowed).length === 0)
check('a certification number', unsourcedNumbers('I am an ISO 45001 lead auditor.', allowed).length === 0)
check('a number from the job advert', unsourcedNumbers('The role asks for 8 years; I have them.', allowed).length === 0)
check('a notice period', unsourcedNumbers('My notice is 30 days.', allowed).length === 0)
check('career span derived from dates (10 years)', derivedExperienceYears(profile, now).includes('10'))
check('a derived span is accepted', unsourcedNumbers('I have 10 years of piping experience.', allowed).length === 0)
check('the current job duration is accepted', unsourcedNumbers('7 years at Gulf Refining', allowed).length === 0)

console.log('\nInvented numbers are caught')
check('an invented percentage', unsourcedNumbers('I reduced costs by 35%.', allowed).join() === '35')
check('an invented team size', unsourcedNumbers('I led 40 engineers.', allowed).join() === '40')
check('an invented money figure', unsourcedNumbers('I saved $2,500,000.', allowed).join() === '2500000')
check('several at once are all reported', unsourcedNumbers('I ran 6 sites and 22 crews.', allowed).length === 2)

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll answer-grounding checks passed')
