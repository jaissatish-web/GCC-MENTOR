import type { TargetCountry } from '@/types/careerProfile'

/**
 * Where the job is and who is hiring, read from the advert (2026-09-23).
 *
 * The optimizer asks only for a job title and the advert (founder decision
 * 2026-08-18), so every saved job had no company and no country, and the
 * Resume Library could not tell "Commissioning Leader" in Saudi Arabia from
 * the same title elsewhere. Both facts are usually in the advert itself.
 *
 * READ, NEVER GUESSED:
 *  - country: only when the job analysis found exactly ONE GCC country;
 *  - company: only from a literal "Company: …" / "Employer: …" / "Client: …"
 *    line. Nothing is taken from a logo, a sentence, or the job title.
 * Callers fill a field only when the job's own field is empty, so a value the
 * user set is never overwritten.
 */

const GCC: readonly TargetCountry[] = ['saudi_arabia', 'uae', 'qatar', 'oman', 'kuwait', 'bahrain']

export function countryFromAnalysis(targetCountries: unknown): TargetCountry | null {
  if (!Array.isArray(targetCountries)) return null
  const gcc = [...new Set(targetCountries.filter((c): c is TargetCountry => GCC.includes(c as TargetCountry)))]
  return gcc.length === 1 ? gcc[0] : null
}

const COMPANY_LINE = /^[ \t*•-]*(?:company|employer|client|hiring company|organi[sz]ation)[ \t]*[:–—-][ \t]*(.+)$/im

export function companyFromAdvert(jobDescription: string | null | undefined): string | null {
  const m = COMPANY_LINE.exec(jobDescription ?? '')
  if (!m) return null
  const name = m[1].replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim()
  // A name, not a sentence: short, and not a description of the company.
  if (name.length < 2 || name.length > 60 || name.split(' ').length > 6) return null
  if (/\b(confidential|undisclosed|not disclosed|n\/a)\b/i.test(name)) return null
  return name
}
