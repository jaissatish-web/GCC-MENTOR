import { isCareerProfileResume } from './careerProfileResume'
import { computeNextAction, focusJob, type NextAction } from './nextAction'
import type { PackageSummary } from './packageSummary'

export const APPLICATION_SELECTION_KEY = 'gcc-application-selection-v1'
export const JOURNEY_GOAL_KEY = 'gcc-journey-goal-v1'
export type JourneyGoal = 'application' | 'cv' | 'interview' | 'professional'
export function validGoal(value: unknown): value is JourneyGoal {
  return ['application', 'cv', 'interview', 'professional'].includes(String(value))
}
export function selectApplication(rows: readonly PackageSummary[], selection: string | null): PackageSummary | null {
  if (selection === 'general') return rows.find(isCareerProfileResume) ?? null
  return rows.find(p => p.id === selection) ?? (focusJob(rows.filter(p => !isCareerProfileResume(p))) as PackageSummary | null) ?? rows[0] ?? null
}
export function applicationHref(href: string, selected: PackageSummary | null): string {
  if (!selected || !['/cover-letter', '/interview-qa', '/mock-interview'].includes(href)) return href
  return `${href}?package=${encodeURIComponent(selected.id)}`
}
export function journeyNextAction(hasProfile: boolean, score: number, rows: readonly PackageSummary[], selected: PackageSummary | null, pending: boolean, goal: JourneyGoal | null): NextAction {
  if (!hasProfile || pending) return computeNextAction(hasProfile ? {} : null, rows, score, 0, pending)
  if (goal === 'interview') return { state: 'job_needs_mock', title: 'Practise your interview', body: 'Use the selected CV. You can type your answers or record your voice.', cta: 'Open interview practice', href: applicationHref('/mock-interview', selected) }
  if (goal === 'professional') return { state: 'add_next_job', title: 'Prepare your recruiter profile', body: 'Review and copy content to LinkedIn or NaukriGulf. You publish the changes yourself.', cta: 'Prepare LinkedIn content', href: '/linkedin-optimization' }
  if (goal === 'cv') return { state: 'add_next_job', title: 'Review your general CV', body: 'Check your saved facts, preview your CV and choose a template.', cta: 'Open my profile and CV', href: '/profile' }
  const applications = selected ? (isCareerProfileResume(selected) ? [] : [selected]) : rows.filter(p => !isCareerProfileResume(p))
  return computeNextAction({}, applications, score)
}
