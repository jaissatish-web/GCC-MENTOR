/**
 * Assertions for the arithmetic Gulf Readiness engine.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-gulf-readiness.ts
 *
 * The engine is pure, so everything it does can be checked here with no model, no
 * database and no browser. This is the whole verification surface for the scoring
 * logic — there is nothing about the number that needs a live anything.
 */

import './resolve-paths'
import { calculateGulfReadiness, scenarioFromAnswers } from '../lib/gulfReadiness/engine'
import { SCENARIO_WEIGHTS, SITUATION_POINTS } from '../lib/gulfReadiness/config'
import type { FunnelAnswers, Scenario } from '../lib/gulfReadiness/types'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const STRONG_GULF_CV = `
JOHN SMITH
john.smith@example.com  |  +971 50 123 4567  |  Dubai, UAE

PROFESSIONAL SUMMARY
Senior Instrumentation Engineer with 12 years of Gulf experience.

WORK EXPERIENCE
Senior Engineer, ADNOC — Abu Dhabi, UAE  2018 - Present
- Commissioned 14 control loops across two refinery units, improving uptime by 18%.
- Led a team of 8 across a $40 million project.
Engineer, Saudi Aramco — Jubail, KSA  2013 - 2018
- Delivered 30+ SAT procedures with 99.2% accuracy.

EDUCATION
B.Tech in Instrumentation, 2012

SKILLS
DCS, PLC, SCADA, Foundation Fieldbus, commissioning, loop checking, HAZOP

CERTIFICATIONS
NEBOSH IGC, PMP certified
`

const FRESHER_CV = `
PRIYA RAJ
priya.raj@example.com  |  +91 90000 00000

OBJECTIVE
Recent graduate seeking opportunities in mechanical engineering.

EDUCATION
B.E. Mechanical Engineering, 2024

PROJECTS
- Final year project on heat exchanger design.
- Internship at a local manufacturing firm, 2023.

SKILLS
AutoCAD, SolidWorks, MATLAB, thermodynamics
`

// --- scenario selection ------------------------------------------------------
console.log('\nScenario selection (funnel is the source of truth)')
const cases: [FunnelAnswers, Scenario][] = [
  [{ hasGulfExperience: true, currentlyInGulf: true }, 'currently_in_gulf'],
  [{ hasGulfExperience: true, currentlyInGulf: false }, 'returner'],
  [{ hasGulfExperience: false, hasProfessionalExperience: true }, 'experienced'],
  [{ hasGulfExperience: false, hasProfessionalExperience: false }, 'fresher'],
]
for (const [answers, expected] of cases) {
  check(`${JSON.stringify(answers)} -> ${expected}`, scenarioFromAnswers(answers) === expected)
}

// --- score is always 0..100 and never exceeds 100 ---------------------------
console.log('\nScore bounds')
for (const [answers] of cases) {
  const r = calculateGulfReadiness({ answers, resumeText: STRONG_GULF_CV })
  check(`${r.scenario}: score ${r.finalScore} in 0..100`, r.finalScore >= 0 && r.finalScore <= 100)
}

// --- the situation dimension behaves as designed ----------------------------
console.log('\nSituation dimension')
const inGulf = calculateGulfReadiness({ answers: { hasGulfExperience: true, currentlyInGulf: true }, resumeText: STRONG_GULF_CV })
const situation = inGulf.dimensions.find((d) => d.key === 'gulf_market_position')
check('currently_in_gulf shows the situation dimension', !!situation)
check('situation is filled to its max (15)', situation?.score === 15 && situation?.max === 15)

const fresher = calculateGulfReadiness({ answers: { hasGulfExperience: false, hasProfessionalExperience: false }, resumeText: FRESHER_CV })
check('fresher hides the situation dimension', !fresher.dimensions.some((d) => d.key === 'gulf_market_position'))
check('fresher can still exceed 0 from education/projects/skills', fresher.finalScore > 0)

// --- a strong in-gulf CV beats a fresher, on the same engine ----------------
console.log('\nScenario differentiation')
check('strong in-gulf CV scores higher than a fresher CV', inGulf.finalScore > fresher.finalScore)
check('each scenario produces its own band label', inGulf.band.label !== fresher.band.label || inGulf.band.key !== fresher.band.key)

// --- band messages route to optimization and never promise hiring -----------
console.log('\nBand messages')
let allRouteToOptimise = true
let anyClaimsHiring = false
for (const scenario of Object.keys(SCENARIO_WEIGHTS) as Scenario[]) {
  for (const band of ['under_50', 'mid', 'ready'] as const) {
    const { BAND_MESSAGES } = require('../lib/gulfReadiness/config')
    const msg: string = BAND_MESSAGES[scenario][band].message.toLowerCase()
    if (!/optimis|tailor|resume/.test(msg)) allRouteToOptimise = false
    if (/(get|getting) (the|a) job|guarantee|will be hired|chance of getting hired|land the job/.test(msg)) anyClaimsHiring = true
  }
}
check('every band message points to optimising/tailoring the resume', allRouteToOptimise)
check('no band message claims a hiring outcome', !anyClaimsHiring)

// --- determinism -------------------------------------------------------------
console.log('\nDeterminism')
const a = calculateGulfReadiness({ answers: { hasGulfExperience: true, currentlyInGulf: false }, resumeText: STRONG_GULF_CV })
const b = calculateGulfReadiness({ answers: { hasGulfExperience: true, currentlyInGulf: false }, resumeText: STRONG_GULF_CV })
check('same inputs -> identical score', a.finalScore === b.finalScore)
check('same inputs -> identical JSON', JSON.stringify(a) === JSON.stringify(b))

// --- thin / empty input degrades honestly, never crashes --------------------
console.log('\nThin and empty input')
const empty = calculateGulfReadiness({ answers: { hasGulfExperience: false, hasProfessionalExperience: false }, resumeText: '' })
check('empty resume does not crash', typeof empty.finalScore === 'number')
check('empty resume flags low signal', empty.lowResumeSignal === true)
check('empty resume never claims high confidence', empty.confidence !== 'high')

const tiny = calculateGulfReadiness({ answers: { hasGulfExperience: true, currentlyInGulf: true }, resumeText: 'hi' })
check('tiny resume still returns a valid score', tiny.finalScore >= 0 && tiny.finalScore <= 100)

// --- weights integrity (also asserted at module load) -----------------------
console.log('\nWeights integrity')
for (const scenario of Object.keys(SCENARIO_WEIGHTS) as Scenario[]) {
  const sum = Object.values(SCENARIO_WEIGHTS[scenario]).reduce((x, y) => x + y, 0)
  check(`${scenario} weights sum to 100`, sum === 100)
  check(`${scenario} situation weight matches its points`, SCENARIO_WEIGHTS[scenario].gulf_market_position === SITUATION_POINTS[scenario])
}

// --- the ranker orders by priority ------------------------------------------
console.log('\nRanker')
const weak = calculateGulfReadiness({ answers: { hasGulfExperience: false, hasProfessionalExperience: true }, resumeText: 'worked somewhere for a while' })
const sorted = weak.recommendations.every((r, i, arr) => i === 0 || arr[i - 1].priority >= r.priority)
check('recommendations are sorted by priority, highest first', sorted)

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} assertion(s) FAILED.\n`)
process.exit(failures === 0 ? 0 : 1)
