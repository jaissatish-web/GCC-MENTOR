import { generate } from '@/lib/ai/provider'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
import { FAST_HOSTS } from '@/lib/resumeParse/pipeline'
import { normTitle } from '@/lib/optimizer/v3/typicalAdvert'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * Typical duties of a job title, for a job listed with none (2026-10-03,
 * launch audit I1: "Typical duties of an Accountant — tick what you did").
 *
 * The list is written from the TITLE alone — never from anyone's profile — and
 * stored per normalised title (migration 064). The user ticks only what they
 * really did; nothing is added to a CV that the user did not choose.
 */

export const TYPICAL_DUTIES_SYSTEM = `You list the typical duties of one job title, as plain CV lines that MOST people who have held this job in the Gulf (GCC) really did.

Rules:
- 10 lines, ordered from the most common duty to the least common.
- Each line is ONE duty, 6 to 16 words, starting with a past-tense action verb (Prepared, Maintained, Supervised, Handled ...).
- Ordinary duties only: no achievements, no numbers, no percentages, no named companies, projects, clients, brands, software products, standards or certifications.
- Plain factual wording; no "successfully", "effectively", "expert", "proven", "strong".
- If the title is unclear, list the duties of its most common meaning.

Return ONLY JSON: {"duties": ["...", "..."]}`

export const dutiesKey = (title: string) => normTitle(title).slice(0, 200)

/** The model's list, cleaned: plain duty lines only, no figures, no repeats. */
export function cleanDuties(raw: unknown): string[] {
  const list = (raw as { duties?: unknown } | null)?.duties
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    if (typeof item !== 'string') continue
    const line = item.replace(/^[\s•\-*\d.)]+/, '').replace(/\s+/g, ' ').trim().replace(/[.;]+$/, '')
    const words = line.split(' ').length
    if (words < 3 || words > 22 || /\d/.test(line)) continue
    const k = line.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(line + '.')
  }
  return out.slice(0, 12)
}

async function readDuties(title: string): Promise<string[] | null> {
  const { data, error } = await createServiceRoleClient().from('typical_role_duties').select('duties').eq('key', dutiesKey(title)).maybeSingle()
  if (error) {
    console.error('typical duties read failed', error.message)
    return null
  }
  return Array.isArray(data?.duties) ? (data.duties as string[]) : null
}

export async function getTypicalDuties(title: string, userId: string): Promise<{ duties: string[]; cached: boolean }> {
  const stored = await readDuties(title)
  if (stored) return { duties: stored, cached: true }
  const res = await generate({
    system: TYPICAL_DUTIES_SYSTEM,
    user: `Job title: ${title.trim().slice(0, 120)}`,
    maxTokens: 1500,
    temperature: 0,
    route: '/api/profile/typical-duties',
    userId,
    configKey: 'job_description',
    stallTimeoutMs: 30_000,
    openRouter: { reasoningOff: true, preferHosts: FAST_HOSTS },
  })
  const duties = cleanDuties(extractJsonObject(res.text))
  if (duties.length < 4) throw new Error('typical duties unusable')
  // ignoreDuplicates: two users asking for the same new title at once keep the first.
  const { error } = await createServiceRoleClient()
    .from('typical_role_duties')
    .upsert({ key: dutiesKey(title), title: title.trim().slice(0, 200), duties, model: 'deepseek-v4-flash' }, { onConflict: 'key', ignoreDuplicates: true })
  if (error) console.error('typical duties write failed', error.message)
  return { duties: (await readDuties(title)) ?? duties, cached: false }
}
