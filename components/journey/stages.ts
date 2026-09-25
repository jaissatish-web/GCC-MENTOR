import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { computeNextAction, PROFILE_THIN_BELOW, type NextAction } from '@/lib/nextAction'
import { cvReady, letterCount, mockDone, qaReady, type PackageListItem } from '@/lib/packageSummary'

/**
 * THE THREE STEPS — the one map of the product a signed-in user is shown
 * (2026-09-25 redesign, founder: "a new user does not know what to do, what is
 * next, or where things come from").
 *
 * Before this, the app spoke three numbering systems at once: the profile said
 * "Step 1", the cover letter "Step 5", Q&A "Step 6", mock "Step 7" — while the
 * optimizer ran its own "Step 1 of 3" and the dashboard said "N of 7 done".
 * A new user never saw steps 2–4, so "Step 5" read as a bug.
 *
 * Seven services collapse into three things a person understands:
 *   1. Tell us who you are     — Career Profile (the source)
 *   2. Get a CV for a job      — target job + Resume Optimizer
 *   3. Apply and interview     — cover letter, Q&A, mock interview
 *
 * Each step says what it is BUILT FROM, which is the "where does this come
 * from" question: step 2 reads step 1, step 3 reads step 2.
 *
 * Presentation only. Which step a user is on is read off the existing
 * `computeNextAction` state (lib/nextAction.ts) — no rule is duplicated here.
 */

export type StageId = 'profile' | 'cv' | 'apply'
export type StageState = 'done' | 'current' | 'open' | 'locked'

export interface Stage {
  id: StageId
  n: 1 | 2 | 3
  /** Short name — nav group, stepper label, page eyebrow. */
  name: string
  /** What you get, one line. */
  outcome: string
  /** Where its input comes from — answers "where is this from". */
  from: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Nav hrefs that belong to this step, in order. */
  navHrefs: readonly string[]
}

export const STAGES: readonly Stage[] = [
  {
    id: 'profile',
    n: 1,
    name: 'Your profile',
    outcome: 'Upload your CV once. We turn it into your Career Profile and a Gulf Readiness score.',
    from: 'Your current CV',
    href: '/profile',
    icon: UserCircleIcon,
    navHrefs: ['/profile'],
  },
  {
    id: 'cv',
    n: 2,
    name: 'Tailored CV',
    outcome: 'Add a job you want. We write a CV for that job, with its ATS score and a PDF.',
    from: 'Built from step 1',
    href: '/optimize/target',
    icon: DocumentTextIcon,
    navHrefs: ['/optimize', '/templates'],
  },
  {
    id: 'apply',
    n: 3,
    name: 'Apply & interview',
    outcome: 'A cover letter, likely interview questions with answers, and a practice interview.',
    from: 'Built from step 2',
    href: '/cover-letter',
    icon: ChatBubbleLeftRightIcon,
    navHrefs: ['/cover-letter', '/interview-qa', '/mock-interview'],
  },
] as const

export function stageById(id: StageId): Stage {
  return STAGES.find((s) => s.id === id)!
}

/** "Step 2 of 3 · Tailored CV" — the eyebrow every service page carries. */
export function stageEyebrow(id: StageId): string {
  const s = stageById(id)
  return `Step ${s.n} of 3 · ${s.name}`
}

/**
 * Which step the user is on, read off the next-action rule that already fired.
 * `null` means every step is done for their latest job.
 */
export function currentStageFor(state: NextAction['state']): StageId | null {
  switch (state) {
    case 'draft_waiting':
    case 'no_profile':
    case 'profile_thin':
      return 'profile'
    case 'no_target_job':
    case 'job_unpaid':
    case 'job_not_generated':
      return 'cv'
    case 'job_needs_letter':
    case 'job_needs_qa':
    case 'job_needs_mock':
      return 'apply'
    case 'add_next_job':
      return null
  }
}

/**
 * What has ever been done, across all jobs. A step is LOCKED only when the
 * step before it has never been done — a user with one finished job can open
 * a cover letter even while the next step is about another job.
 */
export interface StageFacts {
  /** A profile past the thin threshold (lib/nextAction PROFILE_THIN_BELOW). */
  profileDone: boolean
  /** At least one job has its tailored CV. */
  cvDone: boolean
  /** At least one job has letter, Q&A and a finished mock. */
  applyDone: boolean
}

/**
 * current — the step the next action is about ("You are here");
 * done — achieved at least once; open — available, not yet done;
 * locked — its previous step has never been done.
 */
export function stageStates(current: StageId | null, facts: StageFacts): Record<StageId, StageState> {
  const done = [facts.profileDone, facts.cvDone, facts.applyDone]
  const out = {} as Record<StageId, StageState>
  STAGES.forEach((s, i) => {
    out[s.id] =
      s.id === current ? 'current' : done[i] ? 'done' : i === 0 || done[i - 1] ? 'open' : 'locked'
  })
  return out
}

export interface StageSnapshot {
  current: StageId | null
  facts: StageFacts
  states: Record<StageId, StageState>
}

/** Shared with the dashboard so both derive the map the same way. */
export function stageSnapshot(profileScore: number | null, packages: readonly PackageListItem[]): StageSnapshot {
  const hasProfile = profileScore !== null
  const score = profileScore ?? 0
  // The step is about PROGRESS, so a waiting CV reading (hasPendingDraft) is
  // left out here: it is still the dashboard's next action, but it must not
  // move a user with ten jobs back to "step 1".
  const action = computeNextAction(hasProfile ? { readiness_score: score } : null, packages, score)
  const facts: StageFacts = {
    profileDone: hasProfile && score >= PROFILE_THIN_BELOW,
    cvDone: packages.some(cvReady),
    applyDone: packages.some((p) => cvReady(p) && letterCount(p) > 0 && qaReady(p) && mockDone(p)),
  }
  const current = currentStageFor(action.state)
  return { current, facts, states: stageStates(current, facts) }
}

