import { isCareerProfileResume } from '@/lib/careerProfileResume'
import type { PackageSummary } from '@/lib/packageSummary'
import type { MockInterviewRun, Package } from '@/types/package'
import type { VoiceSessionView } from '@/lib/voice/types'

export function unfinishedInterviewWorkspace(packages: readonly PackageSummary[]) {
  return packages.filter(pkg => !isCareerProfileResume(pkg) && pkg.mock_in_progress)
    .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '') || a.id.localeCompare(b.id))[0] ?? null
}

export type HomeInterview = { packageId: string; href: string; saved: number | null; total: number }

/** Read one selected interview; Home never starts a session or requests review. */
export async function loadHomeInterview(packageId: string, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<HomeInterview | null> {
  const response = await fetcher(`/api/packages/${encodeURIComponent(packageId)}`, { cache: 'no-store', signal })
  if (!response.ok) throw new Error('Interview progress unavailable')
  const data = await response.json() as { package?: Package }
  const run: MockInterviewRun | undefined = data.package?.mock_interview_runs?.filter(item => item.status === 'in_progress')
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))[0]
  if (!run) return null
  const result: HomeInterview = {
    packageId,
    href: `/mock-interview?package=${encodeURIComponent(packageId)}&run=${encodeURIComponent(run.id)}${run.input_mode === 'voice' ? '&room=1' : '#interview-report'}`,
    saved: run.input_mode === 'voice' ? null : run.questions.filter(question => question.answer?.trim()).length,
    total: run.questions.length,
  }
  if (run.input_mode === 'voice') {
    try {
      const voice = await fetcher(`/api/packages/${encodeURIComponent(packageId)}/mock-interview/${encodeURIComponent(run.id)}/voice`, { cache: 'no-store', signal })
      if (voice.ok) {
        const view = await voice.json() as VoiceSessionView
        const saved = new Set(view.answers.filter(answer => answer.saved_at).map(answer => answer.question_id))
        result.saved = run.questions.filter(question => saved.has(question.id)).length
      }
    } catch {
      // Still offer the exact room when its optional progress read is unavailable.
    }
  }
  return result
}
