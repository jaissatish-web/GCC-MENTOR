import type { LinkedInOutput } from '@/lib/linkedin/types'

/** Check prose, not saved skill/brand names, which must remain verbatim. */
export function outputLanguageIssue(output: LinkedInOutput, language: 'English' | 'Arabic'): string | null {
  const prose = [output.about, ...output.experience.map(e => e.description), ...output.advice]
  for (const text of prose) {
    if (!text?.trim()) continue // shape validator handles missing fields
    const letters = (text.match(/\p{L}/gu) ?? []).length
    const arabic = (text.match(/\p{Script=Arabic}/gu) ?? []).length
    const latin = (text.match(/\p{Script=Latin}/gu) ?? []).length
    if (language === 'Arabic' && (arabic < 5 || arabic / Math.max(1, letters) < 0.25)) return 'Write every prose section in Arabic as requested. Keep only saved tools, skills and qualification names verbatim.'
    if (language === 'English' && letters > 20 && latin / letters < 0.6) return 'Write every prose section in English as requested. Keep proper names verbatim.'
  }
  return null
}
