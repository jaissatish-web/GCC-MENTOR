/**
 * Assertions for the §B1 fix: GCC country derived from a resume's stated
 * location, and degree equivalence by level + field.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-gcc-experience.ts
 *
 * Both modules are pure, so this is the entire verification surface — no model,
 * no database, no browser. The measured defect this exists to close: a CV with
 * 12 years in Abu Dhabi and Jubail, against a matching Senior Piping Engineer
 * job, scored 48/100 with three categories at zero, because nothing read the
 * location extraction had already returned.
 *
 * The last block reconstructs that exact case end-to-end and asserts the
 * category actually moved.
 */

import './resolve-paths'
import { gccCountryFromLocation } from '../lib/jobMatch/gccLocation'
import { satisfiesRequirement, parseDegree } from '../lib/jobMatch/degreeEquivalence'
import { computeDeterministicCategories } from '../lib/jobMatch/requirementMapping'
import type { JobMatchProfileInput } from '../lib/jobMatch/requirementMapping'
import type { StructuredJobProfile } from '../types/jobMatch'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

// --- location → country ------------------------------------------------------
console.log('\nLocation reading — country named outright')
check('"Abu Dhabi, UAE" → uae', gccCountryFromLocation('Abu Dhabi, UAE')?.country === 'uae')
check('"Riyadh, Saudi Arabia" → saudi_arabia', gccCountryFromLocation('Riyadh, Saudi Arabia')?.country === 'saudi_arabia')
check('"KSA" → saudi_arabia', gccCountryFromLocation('KSA')?.country === 'saudi_arabia')
check('"Doha, Qatar" → qatar', gccCountryFromLocation('Doha, Qatar')?.country === 'qatar')
check('"(U.A.E.)" punctuation → uae', gccCountryFromLocation('Site office (U.A.E.)')?.country === 'uae')

console.log('\nLocation reading — city only, which is how real Gulf CVs are written')
check('"Jubail" → saudi_arabia', gccCountryFromLocation('Jubail')?.country === 'saudi_arabia')
check('"Dubai" → uae', gccCountryFromLocation('Dubai')?.country === 'uae')
check('"Ras Laffan" → qatar', gccCountryFromLocation('Ras Laffan')?.country === 'qatar')
check('"Muscat" → oman', gccCountryFromLocation('Muscat')?.country === 'oman')
check('"Al Ahmadi" → kuwait', gccCountryFromLocation('Al Ahmadi')?.country === 'kuwait')
check('"Manama" → bahrain', gccCountryFromLocation('Manama')?.country === 'bahrain')
check('"Al-Khobar" hyphenated → saudi_arabia', gccCountryFromLocation('Al-Khobar')?.country === 'saudi_arabia')

console.log('\nLocation reading — vague but genuinely Gulf')
check('"Gulf region" → generic_gulf', gccCountryFromLocation('Gulf region')?.country === 'generic_gulf')
check('"Middle East" → generic_gulf', gccCountryFromLocation('Middle East')?.country === 'generic_gulf')

console.log('\nLocation reading — must NOT invent Gulf experience')
check('empty → null', gccCountryFromLocation('') === null)
check('null → null', gccCountryFromLocation(null) === null)
check('"Mumbai, India" → null', gccCountryFromLocation('Mumbai, India') === null)
check('"Chennai" → null', gccCountryFromLocation('Chennai') === null)
check('"Houston, USA" → null', gccCountryFromLocation('Houston, USA') === null)
check('"Romania" does not match Oman', gccCountryFromLocation('Bucharest, Romania') === null)
check('"Ottoman Street, Istanbul, Turkey" does not match Oman', gccCountryFromLocation('Ottoman Street, Istanbul, Turkey') === null)
check('non-GCC country vetoes a city name', gccCountryFromLocation('Sharjah Road, Karachi, Pakistan') === null)
check('Yemen is Middle East but not GCC', gccCountryFromLocation('Aden, Yemen') === null)
check('Iraq is not GCC', gccCountryFromLocation('Basra, Iraq') === null)

console.log('\nLocation reading — an explicit GCC country outranks a city')
check('"Jubail, UAE" takes the stated country', gccCountryFromLocation('Jubail, UAE')?.country === 'uae')

// --- degree parsing ----------------------------------------------------------
console.log('\nDegree parsing')
check('"B.Tech" is a bachelor', parseDegree('B.Tech in Mechanical Engineering').level === 'bachelor')
check('"M.Tech" is a master', parseDegree('M.Tech Mechanical').level === 'master')
check('"Diploma" is a diploma', parseDegree('Diploma in Electrical Engineering').level === 'diploma')
check('"PhD" is a doctorate', parseDegree('PhD Chemical Engineering').level === 'doctorate')
check('"Bachelor of Engineering" reads as generic engineering', parseDegree('Bachelor of Engineering').genericEngineering === true)
check('"B.E. Mechanical" is NOT generic', parseDegree('B.E. Mechanical Engineering').genericEngineering === false)

// --- the equivalence the founder asked for -----------------------------------
console.log('\nDegree equivalence — the B.Tech / B.Eng case')
check('B.Tech Mechanical satisfies B.Eng Mechanical', satisfiesRequirement('B.Tech Mechanical Engineering', 'B.Eng in Mechanical Engineering'))
check('B.E. Mechanical satisfies B.Tech Mechanical', satisfiesRequirement('B.E. Mechanical Engineering', 'B.Tech Mechanical Engineering'))
check('BSc Engineering satisfies Bachelor of Engineering', satisfiesRequirement('BSc Engineering', "Bachelor's Degree in Engineering"))
check('B.Tech Electrical satisfies a generic engineering bachelor', satisfiesRequirement('B.Tech Electrical Engineering', "Bachelor's degree in Engineering"))

console.log('\nDegree equivalence — a higher qualification satisfies a lower requirement')
check('M.Tech Mechanical satisfies a bachelor requirement', satisfiesRequirement('M.Tech Mechanical Engineering', 'Bachelor of Mechanical Engineering'))
check('PhD Chemical satisfies a bachelor requirement', satisfiesRequirement('PhD Chemical Engineering', 'B.E. Chemical Engineering'))

console.log('\nDegree equivalence — and must NOT go the other way, or across disciplines')
check('Diploma does NOT satisfy a bachelor requirement', !satisfiesRequirement('Diploma in Mechanical Engineering', 'B.Tech Mechanical Engineering'))
check('B.Tech does NOT satisfy a master requirement', !satisfiesRequirement('B.Tech Mechanical', 'M.Tech Mechanical Engineering'))
check('Electrical does NOT satisfy a mechanical requirement', !satisfiesRequirement('B.Tech Electrical Engineering', 'B.E. Mechanical Engineering'))
check('BA English does NOT satisfy an engineering requirement', !satisfiesRequirement('BA English Literature', "Bachelor's degree in Engineering"))
check('a generic engineering degree does NOT satisfy a named discipline', !satisfiesRequirement('Bachelor of Engineering', 'B.E. Mechanical Engineering'))
check('an unparseable requirement grants nothing', !satisfiesRequirement('B.Tech Mechanical', 'as per company norms'))

// --- the measured 48/100 case, end to end ------------------------------------
console.log('\nThe measured case: 12 years in Abu Dhabi and Jubail, Senior Piping Engineer')

const job: StructuredJobProfile = {
  job_title: 'Senior Piping Engineer',
  company: null,
  industry: 'engineering_technical',
  seniority: 'senior',
  required_skills: ['Piping Design', 'AutoCAD'],
  preferred_skills: [],
  responsibilities: ['Piping engineering for oil and gas projects'],
  education_requirements: ['B.Eng in Mechanical Engineering'],
  certification_requirements: [],
  min_years_experience: 10,
  max_years_experience: null,
  gcc_experience_required: true,
  gcc_experience_preferred: false,
  target_countries: ['uae'],
  driving_license_required: false,
  languages: [],
} as unknown as StructuredJobProfile

const work = [
  { role: 'Piping Engineer', startDate: '2014-01-01', endDate: '2020-01-01', description: 'Piping design for oil and gas', highlights: [], location: 'Abu Dhabi, UAE' },
  { role: 'Senior Piping Engineer', startDate: '2020-01-01', endDate: '2026-01-01', description: 'Piping engineering', highlights: [], location: 'Jubail' },
]

function profileWith(derive: boolean): JobMatchProfileInput {
  return {
    professionalSummary: null,
    workExperience: work.map((w) => {
      const m = derive ? gccCountryFromLocation(w.location) : null
      return {
        role: w.role,
        startDate: w.startDate,
        endDate: w.endDate,
        description: w.description,
        highlights: w.highlights,
        gccCountry: m ? m.country : null,
        gccCountrySource: m ? ('derived' as const) : null,
      }
    }),
    skillNames: ['Piping Design', 'AutoCAD'],
    certificationNames: [],
    educationEntries: [{ degree: 'B.Tech', fieldOfStudy: 'Mechanical Engineering' }],
    hasDrivingLicense: null,
  }
}

const before = computeDeterministicCategories(profileWith(false), job)
const after = computeDeterministicCategories(profileWith(true), job)

console.log(`  gcc_experience: ${before.gcc_experience?.score} → ${after.gcc_experience?.score}`)
console.log(`  education:      ${before.education?.score} → ${after.education?.score}`)

check('gcc_experience was 0 before the fix', before.gcc_experience?.score === 0)
check('gcc_experience is 100 after it (UAE matches the job\'s target country)', after.gcc_experience?.score === 100)
// Degree equivalence is not location-dependent, so it is on in both columns
// here — `profileWith(false)` only withholds the location reading. What proves
// it is the ATTRIBUTION: the substring path cannot match "B.Tech Mechanical
// Engineering" against "B.Eng in Mechanical Engineering" (neither string
// contains the other), so a 100 that names the requirement under "Counted as
// equivalent qualifications" is the equivalence path and nothing else.
check('education scores 100 on B.Tech vs B.Eng', after.education?.score === 100)
check('the substring path alone would not have matched it',
  !'b.tech mechanical engineering'.includes('b.eng in mechanical engineering') &&
  !'b.eng in mechanical engineering'.includes('b.tech mechanical engineering'))
check('the evidence says the country was read, not confirmed',
  (after.gcc_experience?.evidence ?? []).some((e) => e.includes('read from the location stated on the resume')))
check('the evidence names the equivalent qualification it counted',
  (after.education?.evidence ?? []).some((e) => e.startsWith('Counted as equivalent qualifications:')))

// A user who DID pick the dropdown must be described as confirmed, not derived.
const confirmed = computeDeterministicCategories({
  ...profileWith(true),
  workExperience: profileWith(true).workExperience.map((w) => ({ ...w, gccCountrySource: 'profile' as const })),
}, job)
check('a dropdown-confirmed country produces no "read from the resume" note',
  !(confirmed.gcc_experience?.evidence ?? []).some((e) => e.includes('read from the location')))

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} assertion(s) FAILED.\n`)
process.exit(failures === 0 ? 0 : 1)
