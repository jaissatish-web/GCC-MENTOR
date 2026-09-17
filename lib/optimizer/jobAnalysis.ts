/**
 * Job analysis prompts + validators (2026-09-17). PURE (prompt text and
 * parsing only); the model calls live in lib/optimizer/analyze.ts.
 *
 * Three extraction tasks, all the same trust boundary as
 * lib/ai/jobDescriptionPrompt.ts — transcribe, never invent:
 *
 *   1. JD MODE     advert -> requirements + matchable keywords (one call;
 *                  replaces the separate structuring call, and still returns
 *                  every legacy StructuredJobProfile field)
 *   2. TITLE MODE  job title -> an ESTIMATE of what such adverts usually ask
 *                  for. Scoring and ranking only; never content.
 *   3. BRIDGE      target keywords x profile -> same-meaning evidence, each
 *                  proven by a verbatim quote (verified in evidence.ts)
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import { validateStructuredJobProfile } from '@/lib/ai/jobDescriptionPrompt'
import { GULF_COUNTRIES } from '@/lib/utils'
import { entrySourceText, profileWideText } from './evidence'
import { containsTerm, coversContentStems, isAcronymIn, prepare, tokenize, stem, stemsMatch } from './text'
import type { JobTargetProfile, KeywordImportance, KeywordKind, OptimizationMode, TargetKeyword } from './types'

const KINDS: KeywordKind[] = ['skill', 'tool', 'certification', 'education', 'domain', 'responsibility', 'soft_skill']
const MAX_KEYWORDS = 30

const TARGET_COUNTRY_VALUES = GULF_COUNTRIES.map((c) => c.value)

// ---- 1. JD mode -------------------------------------------------------------

export const JD_ANALYSIS_SYSTEM_PROMPT = `You extract structured, matchable requirements from ONE job advert. There is no candidate in this task.

ABSOLUTE CONSTRAINT — GROUNDING:
- List a requirement only if the advert literally states it or unambiguously implies it.
- Never add typical requirements for "this kind of role" that the advert does not mention.
- Absent facts stay absent: false, null or an empty array — never a guessed default.
- required_experience_years is the number the advert states, or null. Never estimate it.

KEYWORDS are what an applicant-tracking system and a recruiter would search a CV for:
- Use the advert's OWN wording for "term", short (1–4 words): "preventive maintenance", "IFRS", "patient assessment", "AutoCAD".
- "aliases": only spellings that mean EXACTLY the same thing — acronym <-> expansion ("PMP" <-> "Project Management Professional"), common abbreviations. Never related or broader skills. Empty array if none.
- "importance": "must" when stated as required/essential/mandatory or central to the duties; "nice" when preferred/desirable/a plus.
- "kind": one of skill, tool, certification, education, domain, responsibility, soft_skill.
- When the advert accepts ANY ONE of several options ("Bachelor's in Accounting or Finance", "CPA or ACCA"), make ONE keyword: the first option as "term", the others in "alternatives". Never split them into separate keywords.
- Split a phrase that joins two different duties ("budgeting and variance analysis", "month-end and year-end closing") into separate keywords.
- At most ${MAX_KEYWORDS} keywords, most important first. No duplicates. No company names, salaries, locations or benefits.

Respond with ONLY one JSON object, no prose, no markdown fences:

{
  "job_title": <string or null>,
  "title_variants": [<other titles the advert itself uses for this role; empty if none>],
  "seniority": <"entry" | "mid" | "senior" | "lead" | "executive" | null — only if the advert makes it clear>,
  "keywords": [{ "term": <string>, "aliases": [<string>], "alternatives": [<string>], "importance": "must" | "nice", "kind": <kind> }],
  "required_skills": [<short strings, explicitly required skills/technologies>],
  "preferred_skills": [<short strings, described as a plus>],
  "responsibilities": [<short strings, what the role does>],
  "required_experience_years": <integer or null>,
  "industry": <string or null>,
  "gcc_experience_required": <boolean>,
  "gcc_experience_preferred": <boolean>,
  "target_countries": [<zero or more of: ${TARGET_COUNTRY_VALUES.join(', ')}>],
  "education_requirements": [<short strings, only if stated>],
  "certification_requirements": [<short strings, only if stated>],
  "driving_license_required": <boolean>
}`

export function buildJdAnalysisUserPrompt(jobDescription: string, targetJobTitle: string): string {
  return `TARGET JOB TITLE (as the applicant typed it): ${targetJobTitle.trim()}\n\nJOB ADVERT:\n${jobDescription.trim()}`
}

// ---- 2. Title mode ----------------------------------------------------------

export const TITLE_ANALYSIS_SYSTEM_PROMPT = `You describe what job adverts for ONE job title in the Gulf market (Saudi Arabia, UAE, Qatar, Oman, Kuwait, Bahrain) most commonly ask for.

This is an ESTIMATE used only to rank and score a CV against the role in general. It is never written into anyone's CV, and it is not about any candidate.

RULES:
- Only requirements that are genuinely common across adverts for this exact title and seniority. When unsure, leave it out.
- Prefer concrete, searchable terms (tools, methods, standards, core duties, recognised certifications) over generic traits.
- "term" 1–4 words. "aliases" only exact-meaning spellings (acronym <-> expansion). Never related skills.
- "importance": "must" for what nearly every advert asks for; "nice" for common extras.
- "kind": one of skill, tool, certification, education, domain, responsibility, soft_skill.
- Between 10 and 20 keywords, most important first. No employer names.

Respond with ONLY one JSON object, no prose, no markdown fences:

{
  "job_title": <string — the title, cleaned up>,
  "title_variants": [<up to 4 common equivalent titles>],
  "seniority": <"entry" | "mid" | "senior" | "lead" | "executive" | null>,
  "keywords": [{ "term": <string>, "aliases": [<string>], "importance": "must" | "nice", "kind": <kind> }]
}`

export function buildTitleAnalysisUserPrompt(targetJobTitle: string, targetIndustry: string | null): string {
  return (
    `JOB TITLE: ${targetJobTitle.trim()}` +
    (targetIndustry && targetIndustry.trim() ? `\nINDUSTRY (as the applicant typed it): ${targetIndustry.trim()}` : '')
  )
}

// ---- Validation -------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function cleanString(v: unknown, max = 80): string | null {
  if (typeof v !== 'string') return null
  const s = v.replace(/\s+/g, ' ').trim()
  return s && s.length <= max ? s : null
}

function cleanList(v: unknown, maxItems: number, maxLen = 80): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v) {
    const s = cleanString(x, maxLen)
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s)
    if (out.length >= maxItems) break
  }
  return out
}

/** "ms" abbreviates "microsoft": same first letter, its letters in order, at most 4 of them. */
function abbreviates(short: string, long: string): boolean {
  if (short.length > 4 || short.length >= long.length || short[0] !== long[0]) return false
  let i = 0
  for (const ch of long) if (ch === short[i]) i++
  return i === short.length
}

/** Same words in the same order, each the same word family or an abbreviation ("MS Office" = "Microsoft Office"). */
function sameWordsAbbreviated(a: string, b: string): boolean {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.length !== tb.length || ta.length === 0) return false
  return ta.every((x, i) => stemsMatch(stem(x), stem(tb[i])) || abbreviates(x, tb[i]) || abbreviates(tb[i], x))
}

export function validateKeywords(v: unknown): TargetKeyword[] {
  if (!Array.isArray(v)) return []
  const out: TargetKeyword[] = []
  const seen = new Set<string>()
  for (const raw of v) {
    if (!isObject(raw)) continue
    const term = cleanString(raw.term, 60)
    if (!term) continue
    const key = term.toLowerCase()
    if (seen.has(key)) continue
    // A term that contains no letters or digits cannot be matched.
    if (!/[a-z0-9]/i.test(term)) continue
    seen.add(key)
    const importance: KeywordImportance = raw.importance === 'nice' ? 'nice' : 'must'
    const kind: KeywordKind = KINDS.includes(raw.kind as KeywordKind) ? (raw.kind as KeywordKind) : 'skill'
    // An alias drives matching and what may be written, so it must be the same
    // thing: an acronym either way, a spelling variant, or the same word family.
    // "Microsoft Office" -> "Excel" is a related skill, not an alias, and is dropped.
    const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, '')
    const aliases = cleanList(raw.aliases, 4, 60).filter(
      (a) =>
        a.toLowerCase() !== key &&
        (compact(a) === compact(term) ||
          isAcronymIn(a, term) ||
          isAcronymIn(term, a) ||
          sameWordsAbbreviated(a, term) ||
          coversContentStems(a, term) ||
          coversContentStems(term, a)),
    )
    // "Accounting or Finance", "CPA or ACCA": any one satisfies the requirement,
    // so every option matches it. Options are named by the advert itself, and a
    // candidate can only be credited with one their own profile states.
    const alternatives = cleanList(raw.alternatives, 4, 60).filter(
      (a) => a.toLowerCase() !== key && !aliases.some((x) => x.toLowerCase() === a.toLowerCase()),
    )
    // Stored separately as well, so re-validating a stored keyword (the alias
    // filter runs again on read) keeps them.
    out.push({ term, aliases: [...aliases, ...alternatives].slice(0, 8), alternatives, importance, kind })
    if (out.length >= MAX_KEYWORDS) break
  }
  return out
}

const SENIORITY = new Set(['entry', 'mid', 'senior', 'lead', 'executive'])

/** Parse either analysis response. Returns null when it carries no usable keywords. */
export function validateTargetProfile(
  raw: unknown,
  mode: OptimizationMode,
  fallbackTitle: string,
): JobTargetProfile | null {
  if (!isObject(raw)) return null
  const keywords = validateKeywords(raw.keywords)
  const structured = mode === 'job_description' ? validateStructuredJobProfile(raw) : null
  // A JD with no extractable keywords can still carry structured requirements;
  // fold its required/preferred skills in so scoring has something to match.
  if (structured && keywords.length === 0) {
    for (const s of structured.required_skills) keywords.push({ term: s, aliases: [], importance: 'must', kind: 'skill' })
    for (const s of structured.preferred_skills) keywords.push({ term: s, aliases: [], importance: 'nice', kind: 'skill' })
  }
  if (keywords.length === 0) return null
  // The applicant's own title is the headline; the advert's titles are variants.
  const jobTitle = fallbackTitle.trim() || cleanString(raw.job_title, 120) || ''
  const variants: string[] = []
  for (const t of [cleanString(raw.job_title, 120), ...cleanList(raw.title_variants, 4, 120)]) {
    if (!t) continue
    const key = t.toLowerCase()
    if (key === jobTitle.toLowerCase() || variants.some((v) => v.toLowerCase() === key)) continue
    variants.push(t)
  }
  return {
    version: 1,
    mode,
    job_title: jobTitle,
    title_variants: variants,
    seniority: typeof raw.seniority === 'string' && SENIORITY.has(raw.seniority) ? raw.seniority : null,
    keywords: keywords.slice(0, MAX_KEYWORDS),
    structured,
  }
}

// ---- 3. Evidence bridge -----------------------------------------------------

export const BRIDGE_SYSTEM_PROMPT = `You are a strict evidence checker for a CV tool. You decide, for each requirement, whether the candidate's OWN profile text already demonstrates exactly that requirement in different words.

A BRIDGE IS ONLY ALLOWED WHEN THE MEANING IS THE SAME:
- abbreviation or expansion ("CMMS" <-> "computerised maintenance management system")
- the same activity named differently ("planned preventive maintenance" <-> "preventive maintenance schedule")
- a specific instance that IS the requirement ("prepared IFRS financial statements" demonstrates "IFRS")

NEVER BRIDGE:
- related, adjacent or "transferable" skills ("Excel" does not demonstrate "financial modelling")
- a broader or narrower field ("engineering" does not demonstrate "piping design")
- anything inferred from a job title, employer, industry or seniority alone
- soft skills inferred from duties ("coordinated with vendors" does not demonstrate "negotiation")

When in doubt, do not bridge. A missing bridge costs nothing; a wrong one puts a false claim on a real person's CV.

For every bridge, "quote" must be copied EXACTLY, character for character, from the text of the location you name (5–20 words). It is checked automatically; a quote that is not verbatim is discarded.

Respond with ONLY one JSON object, no prose, no markdown fences:
{ "bridges": [ { "term": <requirement exactly as listed>, "location": <"summary" or an entry id exactly as listed>, "quote": <verbatim text> } ] }
Return { "bridges": [] } if nothing qualifies.`

/** Keywords with no literal evidence anywhere — the only ones worth a bridge call. */
export function keywordsNeedingBridge(profile: CareerProfileFull, target: JobTargetProfile): TargetKeyword[] {
  const all = prepare([profileWideText(profile), ...(profile.work_experience ?? []).map(entrySourceText)].join('\n'))
  return target.keywords.filter((k) => !containsTerm(all, k.term, k.aliases))
}

export function buildBridgeUserPrompt(profile: CareerProfileFull, keywords: TargetKeyword[]): string {
  const entries = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((e) => `### location: ${e.id}\n${entrySourceText(e)}`)
    .join('\n\n')
  return (
    'REQUIREMENTS (not yet found literally in the profile):\n' +
    keywords.map((k) => `- ${k.term}${k.aliases.length ? ` (same as: ${k.aliases.join(', ')})` : ''}`).join('\n') +
    '\n\nCANDIDATE PROFILE TEXT:\n### location: summary\n' +
    profileWideText(profile) +
    '\n\n' +
    entries
  )
}
