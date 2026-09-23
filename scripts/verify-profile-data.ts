/**
 * Career Profile data fixes found in the 2026-09-23 real end-to-end test.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-profile-data.ts
 *
 * 1. Extraction left every role's `gcc_country` empty, so three Gulf roles in a
 *    real CV ("Abu Dhabi, UAE", "Duba, Tabuk, Saudi Arabia") showed no GCC
 *    country in the editor. normalizeDraft now reads it from the role's own
 *    written location — never from an employer name.
 * 2. The prompt asked for a FIRST-PERSON summary, which rewrote the CV's own
 *    paragraph ("I am an … engineer") and then lost points on the optimizer's
 *    "no first person" readability check.
 * 3. The CV's headline was stored as an "Additional information" entry.
 * 4. gccExperience() — the overview's GCC years and countries.
 */

import './resolve-paths'
import { EXTRACTION_SYSTEM_PROMPT, normalizeDraft } from '../lib/ai/extractionPrompt'
import { gccExperience, totalExperienceYears } from '../lib/experienceYears'
import { gccCountryFromLocation } from '../lib/jobMatch/gccLocation'
import { renderPlanForPrompt, statedYearsPhrase } from '../lib/optimizer/plan'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

console.log('\nExtraction normalisation')
const draft = normalizeDraft({
  full_name: 'Test Candidate',
  work_experience: [
    { role: 'Instrument Pre-Commissioning Engineer', company: 'CCC', location: 'Duba, Tabuk, Saudi Arabia', start_date: '2024-07' },
    { role: 'Senior Instrument Engineer', company: 'PEC Ltd', location: 'Vietnam', start_date: '2020-12', end_date: '2022-11' },
    { role: 'I&C Pre-Commissioning Engineer', company: 'Bechtel', location: 'Abu Dhabi, UAE', start_date: '2018-06', end_date: '2018-11' },
    { role: 'Engineer', company: 'X', location: 'Somewhere', gcc_country: 'qatar', start_date: '2010-01' },
    { role: 'Engineer', company: 'Saudi Aramco contractor', location: 'Pune, India', start_date: '2009-01' },
  ],
  additional_information: [
    { label: 'Headline', value: 'Instrumentation & Control Commissioning Engineer' },
    { label: 'Languages', value: 'English, Hindi' },
    { label: 'Passport', value: 'Y5072782 (Valid) · NOC Obtainable' },
  ],
})!
const w = draft.work_experience
check('a Saudi location sets saudi_arabia', w[0].gcc_country === 'saudi_arabia')
check('a non-GCC location stays empty', !w[1].gcc_country)
check('Abu Dhabi, UAE sets uae', w[2].gcc_country === 'uae')
check('a value the model already gave is kept', w[3].gcc_country === 'qatar')
check('an employer name never sets it (India location, Aramco in the name)', !w[4].gcc_country)
check('the headline is not stored as additional information', !draft.additional_information.some((a) => a.label === 'Headline'))
check('other additional information is kept', draft.additional_information.some((a) => a.label === 'Languages'))
check('the passport number is still stripped', !draft.additional_information.some((a) => /Y5072782/.test(String(a.value))))

console.log('\nExtraction prompt')
check('no longer asks for a first-person summary', !/first-person summary/i.test(EXTRACTION_SYSTEM_PROMPT))
check('asks to copy the summary as written', /COPY the resume's own summary/.test(EXTRACTION_SYSTEM_PROMPT))

console.log('\nGCC experience')
const resolve = (loc: string | null | undefined) => gccCountryFromLocation(loc)?.country ?? null
const now = new Date('2026-09-01')
const g = gccExperience(
  [
    { start_date: '2024-07', end_date: null, location: 'Duba, Tabuk, Saudi Arabia' },
    { start_date: '2018-06', end_date: '2018-11', location: 'Abu Dhabi, UAE' },
    { start_date: '2014-08', end_date: '2016-06', location: 'Abu Dhabi, UAE' },
    { start_date: '2020-12', end_date: '2022-11', location: 'Vietnam' },
  ],
  resolve,
  now,
)
// 26 + 6 + 23 = 55 months -> 4 whole years
check('years are the merged GCC months, whole years', g.years === 4)
check('countries in order of appearance', g.countries.join(',') === 'saudi_arabia,uae')
check('three roles counted', g.roles === 3)
const overlap = gccExperience(
  [
    { start_date: '2015-01', end_date: '2016-12', location: 'Dubai' },
    { start_date: '2016-01', end_date: '2017-12', gcc_country: 'uae', location: null },
  ],
  resolve,
  now,
)
check('overlapping roles are counted once (3 years, not 4)', overlap.years === 3)
check('no Gulf role gives zero', gccExperience([{ start_date: '2020-01', location: 'Pune, India' }], resolve, now).roles === 0)
check(
  'total experience is unchanged by the new helper',
  totalExperienceYears({ work_experience: [{ start_date: '2011-08', end_date: null }] } as never, now) === 15,
)

console.log('\nSummary years instruction (optimizer plan)')
{
  const plan = (summary: string | null, computedYears: number | null) =>
    renderPlanForPrompt(
      { mode: 'job_description', level: 'moderate', coverageTarget: 0.8, entries: {}, gaps: [], summary: { anchors: [], yearsPhrase: summary ? statedYearsPhrase(summary) : null, computedYears } },
      true,
      [],
      { work_experience: [] } as never,
    )
  const computed = plan('Engineer with experience since 2011.', 15)
  check('no stated duration + dated history -> tells the writer to state "15+ years"', /State "15\+ years" in the first sentence/.test(computed))
  check('...and no longer forbids stating years', !/Do not state or calculate one/.test(computed))
  check('a stated duration still wins', /The profile states "12\+ years"/.test(plan('Engineer with 12+ years in oil and gas.', 15)))
  check('no dates at all -> still forbids a figure', /Do not state or calculate one/.test(plan(null, null)))
}

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
