/**
 * ID-document numbers never reach a CV (lib/idNumbers.ts, 2026-09-18).
 *   node_modules/.bin/sucrase-node scripts/verify-id-numbers.ts
 */
import './resolve-paths'
import { stripIdNumbers } from '../lib/idNumbers'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

check('passport number removed, validity kept', stripIdNumbers('Passport', 'Y5072782 (Valid) · NOC Obtainable') === 'Valid · NOC Obtainable')
check('passport + iqama numbers removed', !/\d{6,}/.test(stripIdNumbers('ID', 'Passport no. K1234567, Iqama number 2345678901')))
check('no stray "no. ," left', !/no\.\s*,/.test(stripIdNumbers('ID', 'Passport no. K1234567, Iqama number 2345678901')))
check('ordinary numbers untouched when no ID word', stripIdNumbers('Key Achievements', '67,000+ loop checks, 200000 BPD') === '67,000+ loop checks, 200000 BPD')
check('languages line untouched', stripIdNumbers('Languages', 'English, Hindi') === 'English, Hindi')

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} assertion(s) FAILED.\n`)
process.exit(failures === 0 ? 0 : 1)
