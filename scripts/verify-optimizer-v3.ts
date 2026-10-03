/**
 * Optimizer v3 safety rules that run without a model (2026-10-02).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-optimizer-v3.ts
 *
 * Each case comes from a real build in the go-live test:
 *  - a rewrite of a real duty that picked up one job term must stay in the CV
 *    (an "enhanced" line), not become a removable "added" line that takes the
 *    real duty with it;
 *  - a line with a number the rewrite lost comes back as the profile has it;
 *  - ", ensuring accuracy and completeness" fluff is cut, never a keyword,
 *    a number or the profile's own words;
 *  - the analysis cache key fits job_analyses.input_hash (exactly 64 chars).
 */

import './resolve-paths'
import { hasNumber, hasOwnDuties, numbersIn, ownShare, trimFiller, trimStuffedTails, withOpener, workedInGcc, type WrittenJob } from '../lib/optimizer/v3/engine'
import { profileHolds, profileListsSkill, regroupCertifications, v3Hash } from '../lib/optimizer/v3/service'
import type { AnalysisV3 } from '../lib/optimizer/v3/engine'
import { looksLikeAdvert, normTitle, typicalKey } from '../lib/optimizer/v3/typicalAdvert'
import type { CareerProfileFull } from '../types/careerProfile'
import { experienceRequirementMet } from '../lib/optimizer/experienceMet'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    failures++
    console.log(`  FAIL  ${name}`)
  }
}

const mepJob = 'Managed a team of 25 technicians and 3 foremen. Prepared method statements, ITPs, and as-built drawings. Led testing and commissioning of AHUs, FCUs, and pumps.'

console.log('enhanced rewrite or new point')
check('real duty + one job term stays a rewrite', ownShare('Led testing and commissioning of AHUs, FCUs, and pumps, including troubleshooting and problem-solving of system failures.', mepJob, ['troubleshooting']) >= 0.5)
check('mostly new words is a new point', ownShare('Mentor junior engineers and technicians to enhance team capability and ensure quality standards.', mepJob, ['mentor junior engineers']) < 0.5)

check('added point repeating a line is caught', ownShare('Managed project documentation, including as-built drawings and O&M manuals.', 'Prepared method statements, ITPs, and as-built drawings, maintaining accurate documentation and O&M manuals.', []) >= 0.75)
check('a genuinely different point is not', ownShare('Generated technical reports on installation progress and quality.', 'Prepared method statements, ITPs, and as-built drawings, maintaining accurate documentation and O&M manuals.', []) < 0.75)

console.log('jobs with no duties (launch audit: nothing to reword)')
check('a job with duties has its own duties', hasOwnDuties({ highlights: ['Managed AP for 400+ vendors'] }))
check('a job listed with no duties has none', !hasOwnDuties({ highlights: [] }) && !hasOwnDuties({ highlights: null, description: '  ' }))
check('a description counts as duties', hasOwnDuties({ highlights: [], description: 'Handled payroll for 200 staff' }))

console.log('summary: Gulf wording and the opening line (launch audit)')
const acct = { professional_summary: 'Audit Associate with 7+ years of experience across India.', work_experience: [
  { id: 'a', role: 'Accountant', company: 'Voltas', location: 'Mumbai, India', start_date: '2025-02-01', end_date: null, sort_order: 0 },
  { id: 'b', role: 'Senior Accountant', company: 'Arabtec Construction LLC', location: 'Muscat, Oman', start_date: '2019-12-01', end_date: '2022-10-01', sort_order: 1 },
] } as unknown as CareerProfileFull
check('a role in Muscat, Oman counts as Gulf experience', workedInGcc(acct))
check('India-only experience does not', !workedInGcc({ ...acct, work_experience: [acct.work_experience[0]] } as CareerProfileFull))
check('a summary without an opening gets one from the profile', withOpener('Skilled in IFRS and VAT.', acct) === 'Accountant with 7+ years of experience. Skilled in IFRS and VAT.')
check('a summary that opens with the title is left alone', withOpener('Accountant with 7+ years in IFRS.', acct) === 'Accountant with 7+ years in IFRS.')

console.log('numbers kept')
check('finds every number', JSON.stringify(numbersIn('a team of 25 on a 40-storey tower worth AED 1,200,000 (12.5%)')) === JSON.stringify(['25', '40', '1,200,000', '12.5']))
check('25 is not in 2025', !hasNumber('Since 2025 the team grew', '25'))
check('3 is not in 30', !hasNumber('30 foremen', '3'))
check('25 found', hasNumber('a team of 25 technicians', '25'))
check('separators may differ', hasNumber('budget of AED 1.200.000', '1,200,000'))

console.log('filler cut, facts and keywords kept')
const acc = 'Processed high-volume AP transactions (500+ per month) and ensured timely payments to vendors'
check('fluff tail cut', trimFiller('Handled petty cash and maintained cash register, ensuring accurate cash management.', 'Handled petty cash and cash register', []) === 'Handled petty cash and maintained cash register.')
check('tail with a job keyword kept', trimFiller('Supervised installation and testing of fire alarm systems, ensuring integration with overall fire-fighting systems.', '', ['fire-fighting systems']).includes('ensuring'))
check('tail with a number kept', trimFiller('Lead month-end close with the team of the finance department, ensuring reporting within 5 days.', '', []).includes('5 days'))
check('profile\'s own words kept', trimFiller(acc + ', maintaining strong vendor relationships.', acc, []).includes('timely payments'))
check('short line untouched', trimFiller('Managed GL, ensuring accuracy.', '', []) === 'Managed GL, ensuring accuracy.')

console.log('keyword-stuffed tails')
const job = (id: string, ...lines: string[]): WrittenJob => ({ id, keptOriginal: false, droppedNew: [], bullets: lines.map((text) => ({ text, isNew: false })) })
const terms = ['stakeholder management', 'shop drawing', 'commissioning']
const cv = trimStuffedTails([job('a', 'Coordinated with consultants for material and shop drawing approvals, facilitating stakeholder management.')], 'MEP supervisor strong in stakeholder management.', [], terms, () => 'Coordinated with consultants for material and shop drawing approvals.')
check('tail cut when its keyword is elsewhere in the CV', cv.jobs[0].bullets[0].text === 'Coordinated with consultants for material and shop drawing approvals.')
const only = trimStuffedTails([job('a', 'Coordinated with consultants for material and shop drawing approvals, facilitating stakeholder management.')], 'MEP supervisor.', [], terms, () => '')
check('tail kept when it is the only place the keyword appears', only.cut === 0)
const fact = trimStuffedTails([job('a', 'Processed high-volume AP transactions (500+ per month) and ensured timely payments to vendors, maintaining strong AP processing.')], 'AP processing timely payments vendors', [], ['AP processing'], () => 'Processed high-volume AP transactions (500+ per month) and ensured timely payments to vendors')
check("the profile's own words are never cut", fact.cut === 0)
const kept = trimStuffedTails([{ ...job('a', 'Led testing of pumps, ensuring commissioning of all systems.'), keptOriginal: true }], 'commissioning', [], terms, () => '')
check("the candidate's unchanged lines are never touched", kept.cut === 0)

console.log('certificate the user adds on the level screen')
const withCerts = (...names: string[]) => ({ certifications: names.map((n, i) => ({ id: String(i), profile_id: 'p', name: n, issuer: null, issue_date: null, expiry_date: null, sort_order: i, created_at: '' })) }) as unknown as CareerProfileFull
check('exact job wording is held', profileHolds(withCerts('LEED AP'), 'LEED AP'))
check('"PMP certification" held by "PMP — Project Management Professional"', profileHolds(withCerts('PMP — Project Management Professional'), 'PMP certification'))
check('licence spelling: "UAE driving license" held by "UAE Driving Licence"', profileHolds(withCerts('UAE Driving Licence'), 'UAE driving license'))
check('licence from the paperwork questions counts', profileHolds({ ...withCerts(), has_driving_license: true, driving_license_country: 'UAE' } as CareerProfileFull, 'UAE driving license'))
check('an India licence does not count for a UAE licence', !profileHolds({ ...withCerts(), has_driving_license: true, driving_license_country: 'India' } as CareerProfileFull, 'UAE driving license'))
check('a different certificate is not held', !profileHolds(withCerts('OSHA 30'), 'LEED AP'))
const ana = { jobField: 'MEP', candidateField: 'MEP', fieldMatch: 'same', ms: 0, inputTokens: 0, outputTokens: 0, requirements: [
  { term: 'LEED AP', importance: 'nice', kind: 'certification', group: 'C', location: null, quote: null },
  { term: 'Revit MEP', importance: 'must', kind: 'tool', group: 'C', location: null, quote: null },
] } as AnalysisV3
const re = regroupCertifications(ana, withCerts('LEED AP', 'Revit MEP'))
check('held certificate moves to shown', re.requirements[0].group === 'A')
check('only certificates and licences move — a tool stays not shown', re.requirements[1].group === 'C')
check('a certificate removed later stops counting', regroupCertifications(re, withCerts('Revit MEP')).requirements[0].group === 'C')

console.log("High's tick-list: skills the user confirms")
const withSkills = (...names: string[]) => ({ certifications: [], skills: names.map((n, i) => ({ id: 's' + i, profile_id: 'p', name: n, sort_order: i, created_at: '' })) }) as unknown as CareerProfileFull
check('a ticked tool is on the profile', profileListsSkill(withSkills('AutoCAD', 'Revit MEP'), 'Revit MEP'))
const hi = { jobField: 'MEP', candidateField: 'MEP', fieldMatch: 'same', ms: 0, inputTokens: 0, outputTokens: 0, requirements: [
  { term: 'Revit MEP', importance: 'must', kind: 'tool', group: 'C', location: null, quote: null },
  { term: 'ASHRAE', importance: 'must', kind: 'standard', group: 'C', location: null, quote: null },
  { term: 'high-rise projects', importance: 'must', kind: 'domain', group: 'C', location: null, quote: null },
] } as AnalysisV3
const hiRe = regroupCertifications(hi, withSkills('Revit MEP'))
check('a ticked tool moves to shown', hiRe.requirements[0].group === 'A')
check('an unticked standard stays not shown', hiRe.requirements[1].group === 'C')
check('experience claims are never ticked in (domain stays not shown)', regroupCertifications(hi, withSkills('high-rise projects')).requirements[2].group === 'C')
check('a skill removed later stops counting', regroupCertifications(hiRe, withSkills()).requirements[0].group === 'C')

console.log('typical advert for a title with no advert')
check('same title in different spelling shares one advert', typicalKey('Senior  MEP Engineer!', null) === typicalKey('senior mep engineer', ''))
check('seniority stays part of the title', normTitle('Senior Accountant') !== normTitle('Accountant'))
check('industry keeps adverts apart', typicalKey('Engineer', 'Oil & Gas') !== typicalKey('Engineer', null))
const good = [
  'Job title',
  'About the role: x.',
  'Key responsibilities:',
  ...Array.from({ length: 10 }, (_, i) => `- Duty number ${i} done in the usual recruiter words for this role.`),
  'Requirements:',
  '- Bachelor degree',
  '- 5 years',
].join('\n')
check('a real advert passes the quality gate', looksLikeAdvert(good))
check('a refusal or stub is rejected', !looksLikeAdvert('I cannot help with that request.') && !looksLikeAdvert('Responsibilities and requirements vary.'))

console.log('analysis cache key')
check('64 characters', v3Hash('Senior MEP Engineer', null, 'Some advert').length === 64)
check('differs from the v2 key space', v3Hash('A', null, 'B') !== v3Hash('A', null, 'C'))

console.log('\nexperience requirements (2026-10-03 live audit: ICU nurse in Bahrain had "ICU experience" and "Gulf experience" missing)')
{
  const now = new Date('2026-10-01')
  const job = (role: string, location: string, start: string, end: string | null, company = 'Hospital') => ({ role, company, location, start_date: start, end_date: end, highlights: [], description: null, gcc_country: null })
  const nurse = { work_experience: [job('Charge Nurse', 'Manama, Bahrain', '2023-05-01', null), job('Charge Nurse', 'Doha, Qatar', '2019-01-01', '2023-04-01'), job('ICU Nurse', 'Beirut, Lebanon', '2016-01-01', '2018-12-01')] } as never
  check('"ICU experience" is met by an ICU Nurse role', experienceRequirementMet(nurse, 'ICU experience', now).ok)
  check('"Gulf experience" is met by Bahrain and Qatar roles', experienceRequirementMet(nurse, 'Gulf experience', now).ok)
  check('"GCC experience" too', experienceRequirementMet(nurse, 'GCC experience', now).ok)
  check('"UAE experience" is not met by Bahrain and Qatar', !experienceRequirementMet(nurse, 'UAE experience', now).ok)
  check('"Qatar experience" is met by the Doha role', experienceRequirementMet(nurse, 'Qatar experience', now).ok)
  check('"5+ years ICU experience" counts only ICU years (3)', !experienceRequirementMet(nurse, '5+ years ICU experience', now).ok && experienceRequirementMet(nurse, '5+ years ICU experience', now).years === 3)
  check('"5+ years experience" counts the whole career', experienceRequirementMet(nurse, '5+ years experience', now).ok)
  check('"5 years Gulf experience" counts Gulf years only', experienceRequirementMet(nurse, '5 years Gulf experience', now).ok && experienceRequirementMet(nurse, '12 years Gulf experience', now).ok === false)
  check('"oil and gas experience" is not met by nursing', !experienceRequirementMet(nurse, 'oil and gas experience', now).ok)
  check('no roles -> not met', !experienceRequirementMet({ work_experience: [] } as never, 'ICU experience', now).ok)
}

if (failures) {
  console.log(`\n${failures} failed`)
  process.exit(1)
}
console.log('\nall passed')
