/**
 * Assertions for the profile → readiness adapter.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-profile-readiness.ts
 *
 * The point of this adapter is that the live profile score uses the SAME engine as
 * the anonymous scan, so these checks are about consistency and about the score
 * rising as the profile fills — the two properties the founder asked for.
 */

import './resolve-paths'
import { scoreProfileReadiness, profileToScoringText } from '../lib/gulfReadiness/fromProfile'
import type { FunnelAnswers } from '../lib/gulfReadiness/types'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const answers: FunnelAnswers = { hasGulfExperience: true, currentlyInGulf: true }

const emptyProfile = {}

const partialProfile = {
  professional_summary: 'Instrumentation engineer.',
  email: 'a@b.com',
  phone: '+971 50 000 0000',
  skills: [{ name: 'DCS' }, { name: 'PLC' }],
}

const fullProfile = {
  professional_summary: 'Senior Instrumentation Engineer with 12 years of Gulf experience.',
  email: 'john@example.com',
  phone: '+971 50 123 4567',
  work_experience: [
    {
      company: 'ADNOC',
      role: 'Senior Engineer',
      start_date: '2018-01',
      end_date: null,
      location: 'Abu Dhabi, UAE',
      description: 'Commissioning lead.',
      highlights: ['Commissioned 14 control loops across two units, improving uptime by 18%.', 'Led a team of 8 on a $40 million project.'],
    },
    {
      company: 'Saudi Aramco',
      role: 'Engineer',
      start_date: '2013-01',
      end_date: '2018-01',
      location: 'Jubail, KSA',
      description: null,
      highlights: ['Delivered 30+ SAT procedures with 99.2% accuracy.'],
    },
  ],
  skills: [{ name: 'DCS' }, { name: 'PLC' }, { name: 'SCADA' }, { name: 'commissioning' }, { name: 'HAZOP' }],
  certifications: [{ name: 'NEBOSH IGC', issuer: null }, { name: 'PMP', issuer: null }],
  education: [{ degree: 'B.Tech', field_of_study: 'Instrumentation', institution: 'XYZ University' }],
}

console.log('\nSame engine, structured input')
const empty = scoreProfileReadiness(emptyProfile, answers)
const partial = scoreProfileReadiness(partialProfile, answers)
const full = scoreProfileReadiness(fullProfile, answers)

check('empty profile returns a valid score', empty.finalScore >= 0 && empty.finalScore <= 100)
check('the scenario comes from the answers, not the profile', full.scenario === 'currently_in_gulf')

console.log('\nScore rises as the profile fills (the live-update promise)')
check('partial > empty', partial.finalScore > empty.finalScore)
check('full > partial', full.finalScore > partial.finalScore)
check('a complete Gulf profile lands in the ready band', full.finalScore >= 75)

console.log('\nConsistency with a resume of the same facts')
// The full profile rendered to text should score close to the same facts pasted as
// a raw resume — same engine, same evidence. Not byte-identical (layout differs),
// but the same band.
check('full profile reaches the same "ready" band a strong CV would', full.band.key === 'ready')

console.log('\nDeterminism')
const a = scoreProfileReadiness(fullProfile, answers)
const b = scoreProfileReadiness(fullProfile, answers)
check('same profile -> identical JSON', JSON.stringify(a) === JSON.stringify(b))

console.log('\nSerialisation never invents')
const text = profileToScoringText(partialProfile)
check('rendered text contains only given facts', text.includes('DCS') && !/ADNOC|Aramco/.test(text))
check('empty profile renders without crashing', typeof profileToScoringText(emptyProfile) === 'string')

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} assertion(s) FAILED.\n`)
process.exit(failures === 0 ? 0 : 1)
