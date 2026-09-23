/**
 * Assertions for the dashboard's "what should I do next" state machine.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-next-action.ts
 *
 * The engine is pure — it reads a profile object, a package array and a score,
 * and returns one action — so the whole of it can be checked here with no
 * model, no database and no browser.
 *
 * WHAT THIS IS ACTUALLY PROTECTING. The rule that matters is ORDER: finish what
 * you started before starting something new. The version this replaced had
 * three tiers and no notion of a half-finished job, so a user who set one up
 * and stopped was told to "optimize your next application" — the product
 * quietly walking past the thing they had abandoned. Several assertions below
 * exist only to keep that from coming back.
 *
 * The `state` field is asserted rather than the copy, because the wording is
 * expected to change and a test that breaks on rewording teaches people to
 * stop reading it.
 */

import './resolve-paths'
import { computeNextAction, focusJob, jobLabel, PROFILE_THIN_BELOW } from '../lib/nextAction'
import type { Package } from '../types/package'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const PROFILE = { readiness_score: 80 }

/** A package with only the fields this engine reads; the rest is never touched. */
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

console.log('\nStates, in priority order')

check(
  'no profile at all asks for a CV, not for a "Career Profile"',
  computeNextAction(null, [], 0).state === 'no_profile'
)

check(
  'a thin profile is the bottleneck before anything else',
  computeNextAction(PROFILE, [pkg()], PROFILE_THIN_BELOW - 1).state === 'profile_thin'
)

check(
  'a thin profile outranks a half-finished job',
  computeNextAction(PROFILE, [pkg({ is_paid: false, optimized_content: null })], 10).state ===
    'profile_thin'
)

check(
  'a complete profile with no jobs asks for the first target job',
  computeNextAction(PROFILE, [], 80).state === 'no_target_job'
)

console.log('\nFinish what you started, before starting something new')

check(
  'an unpaid, ungenerated job is resumed',
  computeNextAction(PROFILE, [pkg({ is_paid: false, optimized_content: null })], 80).state ===
    'job_unpaid'
)

check(
  'and it points at that job, not at a generic route',
  computeNextAction(PROFILE, [pkg({ id: 'abc', is_paid: false, optimized_content: null })], 80)
    .href === '/optimize/pay/abc'
)

check(
  'a paid job whose generation never completed is resumed',
  computeNextAction(PROFILE, [pkg({ is_paid: true, optimized_content: null })], 80).state ===
    'job_not_generated'
)

check(
  'unpaid outranks paid-but-ungenerated when both exist',
  computeNextAction(
    PROFILE,
    [pkg({ id: 'a', is_paid: true, optimized_content: null }), pkg({ id: 'b', is_paid: false, optimized_content: null })],
    80
  ).state === 'job_unpaid'
)

check(
  'a finished CV with no letter asks for the letter',
  computeNextAction(PROFILE, [pkg({ cover_letters: [] as unknown as Package['cover_letters'] })], 80)
    .state === 'job_needs_letter'
)

check(
  'a job that is genuinely complete falls through to the next one',
  computeNextAction(PROFILE, [pkg()], 80).state === 'add_next_job'
)

check(
  'an unfinished job is never skipped in favour of starting another',
  computeNextAction(PROFILE, [pkg({ id: 'done' }), pkg({ id: 'half', is_paid: false, optimized_content: null })], 80)
    .state !== 'add_next_job'
)

check('a saved letter without Q&A points at that same job',
  computeNextAction(PROFILE, [pkg({ id: 'qa-job', interview_questions: null })], 80).href === '/interview-qa?package=qa-job')
check('saved Q&A without a completed mock points at that same job',
  computeNextAction(PROFILE, [pkg({ id: 'mock-job', mock_interview_runs: [] })], 80).href === '/mock-interview?package=mock-job')
check('an unfinished mock does not count as completion',
  computeNextAction(PROFILE, [pkg({ mock_interview_runs: [{ status: 'in_progress' }] as Package['mock_interview_runs'] })], 80).state === 'job_needs_mock')

console.log('\nIt never sends the user somewhere that is not built')

// Application stages do not change which preparation routes are available.
for (const status of ['applied', 'shortlisted', 'interview', 'visa_processing', 'offer'] as const) {
  const action = computeNextAction(PROFILE, [pkg({ status })], 80)
  check(
    `status "${status}" resolves to a route that exists (${action.href})`,
    // Path only: the letter action carries ?package=<id> so the job is preselected.
    ['/optimize/target', '/cover-letter', '/profile', '/interview-qa', '/mock-interview'].includes(action.href.split('?')[0]) ||
      action.href.startsWith('/optimize/pay/') ||
      action.href.startsWith('/optimize/generate/')
  )
}

console.log('\nHow a job is named back to the user')

check('the user label wins', jobLabel(pkg({ name: 'ADNOC attempt 2' })) === 'ADNOC attempt 2')
check('falling back to the job title', jobLabel(pkg()) === 'Piping Engineer')
check(
  'the employer is appended when there is one',
  jobLabel(pkg({ target_company: 'ADNOC' })) === 'Piping Engineer at ADNOC'
)
check(
  'a null employer never becomes "at null"',
  !jobLabel(pkg({ target_company: null })).includes('at')
)
check(
  'a whitespace-only employer is treated as absent',
  jobLabel(pkg({ target_company: '   ' })) === 'Piping Engineer'
)
check(
  'a whitespace-only name falls back rather than rendering blank',
  jobLabel(pkg({ name: '  ' })) === 'Piping Engineer'
)

console.log('\nThe sentence adapts without the decision depending on it')

check(
  'the item count reaches the copy when it is passed',
  computeNextAction(PROFILE, [], 10, 3).body.startsWith('3 items left')
)
check(
  'one item is singular',
  computeNextAction(PROFILE, [], 10, 1).body.startsWith('1 item left')
)
check(
  'and the same state is chosen with no count at all',
  computeNextAction(PROFILE, [], 10).state === 'profile_thin'
)

console.log('\nA waiting CV reading comes first (2026-09-11)')

check(
  'a waiting reading outranks everything, even having no profile yet',
  computeNextAction(null, [], 0, 0, true).state === 'draft_waiting'
)
check(
  'it outranks a thin profile and an unfinished job',
  computeNextAction(PROFILE, [pkg({ is_paid: false, optimized_content: null })], 10, 0, true).state ===
    'draft_waiting'
)
check(
  'it points at the Career Profile, where the decision is made',
  computeNextAction(PROFILE, [], 80, 0, true).href === '/profile'
)
check(
  'without a waiting reading, nothing else changes',
  computeNextAction(PROFILE, [pkg()], 80).state === 'add_next_job'
)

console.log('\nThe dashboard journey follows the same job as the next step (2026-09-23)')
{
  // Newest first, as GET /api/packages returns them.
  const done = pkg({ id: 'done' })
  const noLetter = pkg({ id: 'no-letter', cover_letters: [] as unknown as Package['cover_letters'] })
  const noQa = pkg({ id: 'no-qa', interview_questions: null as unknown as Package['interview_questions'] })
  const unbuilt = pkg({ id: 'unbuilt', optimized_content: null })
  const cases: Array<[string, Package[]]> = [
    ['a letter is needed on an older job', [done, noLetter]],
    ['Q&A is needed on an older job', [done, noQa]],
    ['an unbuilt CV outranks a missing letter', [noLetter, unbuilt]],
  ]
  for (const [name, list] of cases) {
    const focus = focusJob(list)
    const action = computeNextAction(PROFILE, list, 80)
    check(`focus is the next step's job: ${name}`, focus !== null && action.href.includes(focus.id))
  }
  check('every job complete: the newest job is the focus', focusJob([done, pkg({ id: 'older' })])?.id === 'done')
  check('no jobs: no focus', focusJob([]) === null)
}

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
