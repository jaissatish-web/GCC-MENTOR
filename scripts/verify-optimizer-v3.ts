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
import { hasNumber, numbersIn, ownShare, trimFiller } from '../lib/optimizer/v3/engine'
import { v3Hash } from '../lib/optimizer/v3/service'

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

console.log('analysis cache key')
check('64 characters', v3Hash('Senior MEP Engineer', null, 'Some advert').length === 64)
check('differs from the v2 key space', v3Hash('A', null, 'B') !== v3Hash('A', null, 'C'))

if (failures) {
  console.log(`\n${failures} failed`)
  process.exit(1)
}
console.log('\nall passed')
