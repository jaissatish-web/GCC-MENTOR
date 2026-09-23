import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { CTA, NAMES } from '@/lib/serviceLabels'

/**
 * THE CAREER JOURNEY — one definition, read by the landing page and the
 * dashboard (2026-09-23 redesign).
 *
 * The product is one profile feeding several services, not a shelf of tools.
 * Showing the same seven steps in the same order everywhere is what makes that
 * visible: a visitor meets them on the landing page, and meets them again,
 * with their own progress on them, the first time they open the dashboard.
 *
 * Every `href` is an existing route. Nothing here decides anything about a
 * user — the dashboard works out which steps are done from data it already
 * loads (see `journeyProgress`).
 */

export type JourneyStepId = 'profile' | 'readiness' | 'match' | 'optimize' | 'letter' | 'qa' | 'mock'

export interface JourneyStep {
  id: JourneyStepId
  /** The service name, as the nav and the service page call it. */
  name: string
  /** A verb phrase for the step. */
  action: string
  /** What the user hands over at this step. */
  give: string
  /** What they get back. */
  get: string
  /** Why it matters, in one plain sentence. */
  why: string
  /** Signed-in destination. */
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export const JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    id: 'profile',
    name: 'Career Profile',
    action: 'Build your Career Profile',
    give: 'Your current CV — upload it, paste it or type it',
    get: 'One checked record of your roles, projects, skills and certificates',
    why: 'Every CV, letter and interview answer is written only from this record, so it is built once and kept right.',
    href: '/profile',
    icon: UserCircleIcon,
  },
  {
    id: 'readiness',
    name: 'Gulf Readiness',
    action: 'Check your Gulf readiness',
    give: 'Nothing extra — it reads your profile',
    get: 'A score across six areas, your strengths, and what to fix first',
    why: 'Shows how clearly your CV presents what Gulf employers look for, before you apply anywhere.',
    href: '/profile?improve=gulf',
    icon: ChartBarIcon,
  },
  {
    id: 'match',
    name: NAMES.targetJob,
    action: 'Add the job you want',
    give: 'The job title, and the job description if you have it',
    get: 'What the job asks for, matched against your profile',
    why: 'A CV is judged against one job. Knowing what it asks for tells you what to bring forward.',
    href: '/optimize/target',
    icon: DocumentMagnifyingGlassIcon,
  },
  {
    id: 'optimize',
    name: NAMES.optimizedCv,
    action: CTA.optimizeCv,
    give: 'A level: Easy, Moderate or High',
    get: 'A CV written for that job, its ATS score before and after, and a PDF in a GCC template',
    why: 'The same experience, presented in the words this employer is searching for. Anything new is shown to you and kept only if you confirm it.',
    href: '/optimize/target',
    icon: DocumentTextIcon,
  },
  {
    id: 'letter',
    name: NAMES.coverLetter,
    action: CTA.writeCoverLetter,
    give: 'A tone: Professional, Short, Technical or Explanatory',
    get: 'A letter for the same job, written from the same CV',
    why: 'Explains your fit in a few paragraphs, consistent with the CV it travels with.',
    href: '/cover-letter',
    icon: EnvelopeIcon,
  },
  {
    id: 'qa',
    name: NAMES.interviewQa,
    action: CTA.prepareInterviewQa,
    give: 'Nothing extra — it uses the optimized CV and the job',
    get: 'Up to 25 likely questions with answers drawn from your own experience',
    why: 'You will be asked about every line on your CV. Prepare answers you can stand behind.',
    href: '/interview-qa',
    icon: QuestionMarkCircleIcon,
  },
  {
    id: 'mock',
    name: NAMES.mockInterview,
    action: CTA.startMockInterview,
    give: 'Your written answers, one question at a time',
    get: 'A saved feedback report on each answer',
    why: 'Practise out loud in writing first, so the real interview is the second time you answer.',
    href: '/mock-interview',
    icon: ChatBubbleLeftRightIcon,
  },
] as const

export type JourneyStepState = 'done' | 'next' | 'todo'

/** Facts the dashboard already has. Each one is a flag it has loaded, never a guess. */
export interface JourneyFacts {
  hasProfile: boolean
  /** Profile past the "thin" threshold the next-step logic uses. */
  profileSolid: boolean
  hasTargetJob: boolean
  hasOptimizedCv: boolean
  hasLetter: boolean
  hasQa: boolean
  hasMock: boolean
}

/**
 * Which steps are done, and which ONE is next.
 *
 * Readiness has no stored "done" state — the score is computed live from the
 * profile — so it counts as done once a solid profile exists. That is the
 * honest reading: from then on the score is always there to look at.
 */
export function journeyProgress(facts: JourneyFacts): Record<JourneyStepId, JourneyStepState> {
  const done: Record<JourneyStepId, boolean> = {
    profile: facts.hasProfile && facts.profileSolid,
    readiness: facts.hasProfile && facts.profileSolid,
    match: facts.hasTargetJob,
    optimize: facts.hasOptimizedCv,
    letter: facts.hasLetter,
    qa: facts.hasQa,
    mock: facts.hasMock,
  }
  const out = {} as Record<JourneyStepId, JourneyStepState>
  let nextGiven = false
  for (const step of JOURNEY_STEPS) {
    if (done[step.id]) {
      out[step.id] = 'done'
    } else if (!nextGiven) {
      out[step.id] = 'next'
      nextGiven = true
    } else {
      out[step.id] = 'todo'
    }
  }
  return out
}
