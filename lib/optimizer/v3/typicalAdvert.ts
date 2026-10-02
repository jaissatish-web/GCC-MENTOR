import { generate } from '@/lib/ai/provider'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { FAST_HOSTS } from '@/lib/resumeParse/pipeline'

/**
 * A TYPICAL GULF JOB ADVERT for a job title (founder, 2026-10-02: many Gulf
 * jobs come by WhatsApp or through an agent with only a title).
 *
 * Without an advert the analysis used to "use the job title" while looking at
 * the candidate's profile — so the requirements drifted toward what the person
 * already had, changed run to run, and title-only scores came out flatteringly
 * high (85–94 in the lab). Instead, one typical advert per title is written
 * WITHOUT seeing any profile, stored in typical_job_adverts (migration 062),
 * and every user targeting that title is matched against the same text. The
 * rest of the optimizer runs on it exactly as on a pasted advert.
 */

export const TYPICAL_ADVERT_SYSTEM = `ROLE
You are a senior Gulf recruiter who has written hundreds of job adverts for the GCC (UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain).

TASK
Write ONE typical job advert for the job title given, the way GCC employers and agencies usually post it. It is used to tell candidates what this kind of role normally asks for.

CONTENT — in this order, plain text:
Job title
About the role: 2 sentences.
Key responsibilities: 8–12 bullets, each one duty in the words recruiters use.
Requirements:
- education usually asked for
- years of experience typical for the seniority the title implies
- the core technical skills, tools and software for this role
- certifications, licences or registrations GCC employers commonly ask for in this role (for example Saudi Council of Engineers membership, a DHA/DOH/MOH/SCFHS licence for healthcare, a GCC driving licence where the job needs one) — only ones that are really common for this role
- the soft skills adverts for this role usually list
Desirable: 3–5 bullets.

RULES
- Use the standard terms recruiters and ATS software use for this field.
- Typical, not extreme: what most adverts for this title ask, not a wish list of everything.
- No company name, salary, benefits, location details or invented facts about an employer.
- Plain text with "-" bullets. No markdown headings, no commentary before or after.`

/** "Senior  MEP Engineer!" → "senior mep engineer". */
export function normTitle(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9+#&/ ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export const typicalKey = (title: string, industry: string | null) => `${normTitle(title)}|${normTitle(industry)}`.slice(0, 400)

/** The stored advert for this title, or null — no model call. */
export async function readTypicalAdvert(title: string, industry: string | null): Promise<string | null> {
  const { data, error } = await createServiceRoleClient().from('typical_job_adverts').select('advert').eq('key', typicalKey(title, industry)).maybeSingle()
  if (error) console.error('typical advert read failed', error.message)
  return (data?.advert as string | undefined) ?? null
}

/** Checks a generated advert is a real advert, not a refusal or a stub. */
export function looksLikeAdvert(text: string): boolean {
  const bullets = (text.match(/^\s*[-•*]\s+\S/gm) ?? []).length
  return text.length >= 400 && text.length <= 12000 && bullets >= 8 && /responsibilit/i.test(text) && /requirement/i.test(text)
}

/** The typical advert for a title: stored, or written once and stored. */
export async function getTypicalAdvert(title: string, industry: string | null, route: string): Promise<{ advert: string; cached: boolean }> {
  const stored = await readTypicalAdvert(title, industry)
  if (stored) return { advert: stored, cached: true }
  const res = await generate({
    system: TYPICAL_ADVERT_SYSTEM,
    user: `Job title: ${title.trim()}${industry?.trim() ? `\nIndustry: ${industry.trim()}` : ''}`,
    maxTokens: 2500,
    temperature: 0,
    route,
    configKey: 'job_description',
    stallTimeoutMs: 40_000,
    openRouter: { reasoningOff: true, preferHosts: FAST_HOSTS },
  })
  const advert = res.text.replace(/^```\w*\n?|```$/g, '').trim()
  if (!looksLikeAdvert(advert)) throw new Error('typical advert unusable')
  // ignoreDuplicates: two users asking for the same new title at once keep the first.
  const { error } = await createServiceRoleClient()
    .from('typical_job_adverts')
    .upsert({ key: typicalKey(title, industry), title: title.trim().slice(0, 300), industry: industry?.trim() || null, advert, model: 'deepseek-v4-flash' }, { onConflict: 'key', ignoreDuplicates: true })
  if (error) console.error('typical advert write failed', error.message)
  // Read back so a concurrent writer's text wins for everyone.
  return { advert: (await readTypicalAdvert(title, industry)) ?? advert, cached: false }
}
