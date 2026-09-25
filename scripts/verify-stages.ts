/**
 * Assertions for the three-step map (components/journey/stages.ts).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-stages.ts
 *
 * The map is what a new user reads to know where they are. What it must never
 * do: send a user with finished jobs back to "step 1", or lock a service the
 * user can already use.
 */

import './resolve-paths'
import { stageSnapshot, currentStageFor } from '../components/journey/stages'
import type { Package } from '../types/package'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

function pkg(over: Partial<Package> = {}): Package {
  return {
    id: 'pkg-1',
    target_job_title: 'Piping Engineer',
    target_company: null,
    name: null,
    is_paid: true,
    optimized_content: {} as Package['optimized_content'],
    cover_letters: [{ id: 'cl-1' }] as unknown as Package['cover_letters'],
    interview_questions: { questions: [{ id: 'qa-1' }] } as unknown as Package['interview_questions'],
    mock_interview_runs: [{ id: 'run-1', status: 'completed' }] as Package['mock_interview_runs'],
    status: 'applied',
    created_at: '2026-09-01T00:00:00Z',
    ...over,
  } as Package
}
const fresh = (id: string) => pkg({ id, is_paid: false, optimized_content: null, cover_letters: [], interview_questions: null, mock_interview_runs: [] })

console.log('\nWhere the user is')

const none = stageSnapshot(null, [])
check('no profile: step 1 is current', none.current === 'profile' && none.states.profile === 'current')
check('no profile: steps 2 and 3 are locked', none.states.cv === 'locked' && none.states.apply === 'locked')

const thin = stageSnapshot(10, [])
check('thin profile is still step 1', thin.current === 'profile')
check('thin profile: step 2 locked', thin.states.cv === 'locked')

const solid = stageSnapshot(80, [])
check('solid profile, no job: step 2 current, step 1 done', solid.current === 'cv' && solid.states.profile === 'done')
check('solid profile, no job: step 3 locked', solid.states.apply === 'locked')

const needsLetter = stageSnapshot(80, [pkg({ cover_letters: [] })])
check('CV built, no letter: step 3 current', needsLetter.current === 'apply' && needsLetter.states.cv === 'done')

const allDone = stageSnapshot(80, [pkg()])
check('everything done: no current step, all done', allDone.current === null && Object.values(allDone.states).every((s) => s === 'done'))

console.log('\nNever lock what already works')

const mixed = stageSnapshot(80, [fresh('new'), pkg({ id: 'old' })])
check('a new unfinished job makes step 2 current', mixed.current === 'cv')
check('…but step 3 stays open (done) because another job finished it', mixed.states.apply === 'done')

const mixed2 = stageSnapshot(80, [fresh('new'), pkg({ id: 'old', cover_letters: [] })])
check('an older job with a CV keeps step 3 available', mixed2.states.apply !== 'locked')

console.log('\nThe map follows next-action states')
check('draft waiting maps to step 1 in currentStageFor', currentStageFor('draft_waiting') === 'profile')
check('add_next_job maps to no current step', currentStageFor('add_next_job') === null)

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll stage checks passed')
