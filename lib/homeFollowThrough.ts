import type { PackageListPage, PackageSummary } from '@/lib/packageSummary'
import { isCareerProfileResume } from '@/lib/careerProfileResume'
import type { NextAction } from '@/lib/nextAction'

/** Read every lightweight page: a recently created job is not necessarily the next deadline. */
export async function fetchHomePackages(fetcher: typeof fetch = fetch): Promise<PackageSummary[]> {
  const rows = new Map<string, PackageSummary>()
  const cursors = new Set<string>()
  let cursor: PackageListPage['next_cursor'] = null
  do {
    const query = new URLSearchParams({ view: 'summary', limit: '100' })
    if (cursor) { query.set('before', cursor.before); query.set('before_id', cursor.before_id) }
    const response = await fetcher(`/api/packages?${query}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Unable to load workspaces')
    const page = await response.json() as PackageListPage
    if (!Array.isArray(page.packages)) throw new Error('Invalid workspace list')
    for (const row of page.packages) if (!isCareerProfileResume(row)) rows.set(row.id, row)
    cursor = page.next_cursor ?? null
    if (cursor) {
      const key = JSON.stringify(cursor)
      if (cursors.has(key)) throw new Error('Workspace pagination did not advance')
      cursors.add(key)
    }
  } while (cursor)
  return [...rows.values()]
}

export function nextActionWorkspace(action: NextAction, packages: readonly PackageSummary[]): PackageSummary | null {
  const url = new URL(action.href, 'https://gcc-mentor.local')
  const queryId = url.searchParams.get('package')
  const pathId = url.pathname.match(/^\/optimize\/(?:pay|generate)\/([^/]+)$/)?.[1]
  const id = queryId ?? (pathId ? decodeURIComponent(pathId) : null)
  return id ? packages.find(pkg => pkg.id === id) ?? null : null
}

export type HomeReminder = {
  id: string; kind: 'deadline' | 'interview'; pkg: PackageSummary; date: Date
  days: number; earlierToday: boolean
}
const dayNumber = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
function deadlineDate(value: string | null): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

/** Civil dates for deadlines; local calendar days and actual instants for interviews. */
export function homeReminders(packages: readonly PackageSummary[], now = new Date()): HomeReminder[] {
  const result: HomeReminder[] = []
  for (const pkg of packages) {
    if (isCareerProfileResume(pkg) || ['rejected', 'withdrawn', 'offer', 'visa_processing'].includes(pkg.status)) continue
    const deadline = deadlineDate(pkg.application_deadline)
    if (pkg.status === 'saved' && deadline) {
      const days = dayNumber(deadline) - dayNumber(now)
      if (days >= -7) result.push({ id: `${pkg.id}-deadline`, kind: 'deadline', pkg, date: deadline, days, earlierToday: false })
    }
    const interview = pkg.interview_date ? new Date(pkg.interview_date) : null
    if (interview && Number.isFinite(interview.getTime())) {
      const days = dayNumber(interview) - dayNumber(now)
      if (days >= 0) result.push({ id: `${pkg.id}-interview`, kind: 'interview', pkg, date: interview, days, earlierToday: days === 0 && interview < now })
    }
  }
  const priority = (item: HomeReminder) => item.days < 0 ? 0.5 : item.earlierToday ? 0.25 : item.days
  return result.sort((a, b) => priority(a) - priority(b) || (a.kind === b.kind ? a.date.getTime() - b.date.getTime() : a.kind === 'interview' ? -1 : 1) || a.id.localeCompare(b.id))
}

export function reminderTiming(reminder: Pick<HomeReminder, 'days' | 'earlierToday'>): string {
  if (reminder.earlierToday) return 'Earlier today'
  if (reminder.days < 0) return `${-reminder.days} day${reminder.days === -1 ? '' : 's'} overdue`
  if (reminder.days === 0) return 'Today'
  if (reminder.days === 1) return 'Tomorrow'
  return `In ${reminder.days} days`
}
