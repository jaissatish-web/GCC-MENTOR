/**
 * Claim checks on generated prose (lib/ai/proseClaims.ts).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-prose-claims.ts
 *
 * The letter sentences below are the ones the 2026-09-18 audit found in a real
 * cover letter; the profile is a synthetic commissioning engineer with the same
 * shape of evidence (commissioning, no design or specification work).
 */
import './resolve-paths'
import { checkProseClaims, removeClaimSentences, totalExperienceYears } from '../lib/ai/proseClaims'
import type { CareerProfileFull } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const evidence = `Instrument Pre-Commissioning Engineer
Completed 50,000+ instrumentation loop checks with 99.2% first-pass accuracy.
Led fail-safe logic verification, cause & effect matrix sign-off, and control philosophy validation.
Coordinated FAT/SAT with OEM vendors; managed ITR/ICAPS sign-off.
Prepared loop diagrams, data sheets, Instrument Index, I/O lists; reviewed P&IDs and hook-up drawings.
Zero LTI across 15+ years supervising teams of 30+ engineers.
Skills: DCS Validation, SIS commissioning, SmartPlant Instrumentation (SPI/INtools), IEC 61511`

const gaps = [
  { term: 'Technical Specification packages', kind: 'responsibility' },
  { term: 'Instrumentation & Control design', kind: 'responsibility' },
  { term: 'Cable Schedules', kind: 'responsibility' },
  { term: 'Control Valves sizing', kind: 'skill' },
  { term: 'analytical problem-solving', kind: 'soft_skill' },
]
const ctx = { evidence, gaps, totalYears: 14 }
const hard = (text: string) => checkProseClaims({ ...ctx, text }).filter((i) => i.severity === 'hard')

console.log('\nFabrications from the audited letter are caught')
check('"technical specification packages" is a gap claim', hard('I also supported procurement through technical specification packages and vendor documentation review.').some((i) => i.code === 'gap_claim'))
check('"system specification" is caught as a gap word', hard('I bring strong capability in control philosophy work and system specification.').some((i) => i.code === 'gap_word'))
check('"my blend of design, commissioning and safety experience" is caught', hard('I am confident that my blend of design, commissioning, and safety experience will help.').some((i) => i.code === 'gap_word'))
check('"nearly 13 years of experience" is wrong for 14 years', hard('With nearly 13 years of experience in instrumentation and control engineering, I bring a lot.').some((i) => i.code === 'wrong_years'))
check('"20 years of experience" is an overstatement', hard('I have 20 years of experience in commissioning.').some((i) => i.code === 'wrong_years'))

console.log('\nTrue statements pass')
check('supported commissioning sentence has no hard issue', hard('In my current role I validate control philosophies and lead cause & effect matrix sign-off for all safety-critical systems.').length === 0)
check('"15+ years" stated in the profile passes', hard('I bring more than 15+ years of experience across mega-projects.').length === 0)
check('"14 years of experience" passes', hard('I have 14 years of experience in instrumentation.').length === 0)
check('a soft-skill gap is not policed as a claim', hard('I apply analytical problem-solving on every loop check.').length === 0)
check('reviewing P&IDs and preparing data sheets passes', hard('I have prepared Instrument Index, I/O lists and loop diagrams, and reviewed P&IDs.').length === 0)

console.log('\nHonest gap sentences are not claims')
check('"I have not performed valve sizing from scratch" passes', hard('My primary experience is commissioning. I have not performed control valve sizing from scratch.').length === 0)
check('"keen to grow into I&C design" passes', hard('I am keen to grow into Instrumentation & Control design work at Quest Global.').length === 0)
check('"although I led the design" is still caught', hard('Although busy, I led the design of the SIS architecture.').some((i) => i.code === 'gap_word'))

console.log('\nSentence removal keeps the true sentences')
const para = 'I coordinated FAT/SAT with OEM vendors. I also supported procurement through technical specification packages. I completed 50,000+ loop checks.'
const cleaned = removeClaimSentences(para, ctx)
check('the fabricated sentence is removed', !/specification/i.test(cleaned))
check('both true sentences remain', /FAT\/SAT/.test(cleaned) && /50,000\+/.test(cleaned))

console.log('\nYears are computed from the roles, overlaps once')
const profile = {
  work_experience: [
    { start_date: '2011-08', end_date: '2012-05' },
    { start_date: '2012-07', end_date: '2014-07' },
    { start_date: '2014-08', end_date: '2016-06' },
    { start_date: '2016-07', end_date: '2018-06' },
    { start_date: '2018-06', end_date: '2018-11' },
    { start_date: '2018-12', end_date: '2020-11' },
    { start_date: '2020-12', end_date: '2022-11' },
    { start_date: '2022-12', end_date: '2024-02' },
    { start_date: '2024-07', end_date: null },
  ],
} as unknown as CareerProfileFull
const years = totalExperienceYears(profile)
check(`a 2011–present career with short gaps is 14–15 years (${years})`, years !== null && years >= 14 && years <= 15)
check('no dated roles -> null', totalExperienceYears({ work_experience: [] } as unknown as CareerProfileFull) === null)

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} assertion(s) FAILED.\n`)
process.exit(failures === 0 ? 0 : 1)
