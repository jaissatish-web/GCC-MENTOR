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
import { hasNumber, hasOwnDuties, numbersIn, ownShare, trimFiller, trimStuffedTails, type WrittenJob } from '../lib/optimizer/v3/engine'
import { profileHolds, profileListsSkill, regroupCertifications, v3Hash } from '../lib/optimizer/v3/service'
import type { AnalysisV3 } from '../lib/optimizer/v3/engine'
import { looksLikeAdvert, normTitle, typicalKey } from '../lib/optimizer/v3/typicalAdvert'
import type { CareerProfileFull } from '../types/careerProfile'

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

if (failures) {
  console.log(`\n${failures} failed`)
  process.exit(1)
}
console.log('\nall passed')
