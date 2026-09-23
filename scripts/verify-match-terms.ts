/**
 * Job-match false gaps found on a real CV and a real KSA advert (2026-09-23).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-match-terms.ts
 *
 * A 15-year I&C commissioning engineer scored 54/100 on keywords against
 * "Commissioning Leader – Instrument/Analyzer" partly because of spelling and
 * phrasing, not substance. Each case below was a gap on that report.
 * The last block guards against the fixes becoming loose.
 */

import './resolve-paths'
import { containsTerm, containsTermInSentence, prepare, termVariants } from '../lib/optimizer/text'
import { companyFromAdvert, countryFromAnalysis } from '../lib/optimizer/jobFacts'
import { mostlyUnanswered } from '../lib/optimizer/buildOutcome'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}
const found = (text: string, term: string) => containsTerm(prepare(text), term) || containsTermInSentence(text, term)

console.log('\nFalse gaps now found')
check('"analysers" (British) meets "Analyzers"', found('Optimised maintenance for 3,000+ instruments (HART/Fieldbus transmitters, control valves, analysers)', 'Analyzers'))
check('"analyser" meets "Analyzer"', found('Commissioned the gas analyser house', 'Analyzer'))
check(
  '"instrumentation loop checks" meets "Instrument Loop Tests"',
  found('Completed 50,000+ instrumentation loop checks ahead of schedule with 99.2% first-pass accuracy', 'Instrument Loop Tests'),
)
check('"loop testing" meets "loop checks"', found('Skills: loop testing, dry/wet testing', 'loop checks'))
check('"oil & gas" meets "Oil & Gas industry"', found('Commissioning engineer on oil & gas, refinery and utilities projects', 'Oil & Gas industry'))
check('"EPC" meets "EPC experience"', found('Coordinated with EPC contractors', 'EPC experience'))

console.log('\nStill strict')
check('"industry" alone is never a term variant of nothing', !termVariants('Industry experience').includes(''))
check('"loop tests" is not met by "tests" alone', !found('Completed 12,000 function tests on DCS', 'Instrument Loop Tests'))
check('"Oil & Gas industry" is not met by "gas turbine"', !found('Commissioned gas turbine generators', 'Oil & Gas industry'))
check('"Analyzers" is not met by "analysis"', !found('Led root cause analysis on failures', 'Analyzers'))
check('an unrelated trade term gains no alias', termVariants('Control Valves').every((v) => /control valves/i.test(v)))

console.log('\nJob facts read from the advert (Library country and company)')
check('one GCC country in the analysis -> that country', countryFromAnalysis(['saudi_arabia']) === 'saudi_arabia')
check('two GCC countries -> none (ambiguous)', countryFromAnalysis(['saudi_arabia', 'uae']) === null)
check('a non-GCC country is ignored', countryFromAnalysis(['india']) === null)
check('garbage is ignored', countryFromAnalysis('saudi_arabia') === null)
check('"Company: KENT" line -> KENT', companyFromAdvert('\nCompany: KENT\nLocation: Kingdom of Saudi Arabia (KSA)') === 'KENT')
check('"Employer - Saudi Aramco." -> Saudi Aramco', companyFromAdvert('Employer - Saudi Aramco.') === 'Saudi Aramco')
check('no labelled line -> none', companyFromAdvert('KENT, a global leader in engineering, is seeking…') === null)
check('a sentence is not a company name', companyFromAdvert('Company: we are a fast growing company in the region with many clients') === null)
check('"Confidential" is not a company', companyFromAdvert('Company: Confidential') === null)

console.log('\nA build the AI mostly did not answer is a failure, not a result')
{
  const sel = { summary: true, experienceIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'] }
  const kept = (n: number, reason: 'no_output' | 'grounding') =>
    ({ kept_original: Array.from({ length: n }, (_, i) => ({ block: i === 0 ? 'summary' : `r${i}`, reason })) }) as never
  check('the real High build (8 of 10 unanswered) fails', mostlyUnanswered(kept(8, 'no_output'), sel).failed)
  check('the real Moderate build (2 of 10 unanswered) is kept', !mostlyUnanswered(kept(2, 'no_output'), sel).failed)
  check('exactly half is kept', !mostlyUnanswered(kept(5, 'no_output'), sel).failed)
  check('grounding rejections never count as unanswered', !mostlyUnanswered(kept(10, 'grounding'), sel).failed)
  check('no report -> not failed', !mostlyUnanswered(null, sel).failed)
  check('duplicate entries for one block count once', mostlyUnanswered({ kept_original: [{ block: 'summary', reason: 'no_output' }, { block: 'summary', reason: 'no_output' }] } as never, { summary: true, experienceIds: ['a', 'b'] }).unanswered === 1)
}

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
