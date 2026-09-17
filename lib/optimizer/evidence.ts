/**
 * Evidence map: every target keyword against the candidate's own profile
 * (2026-09-17). PURE — no AI, no database.
 *
 * This is where "what may this resume say?" is decided, in code, before any
 * model writes a word. A keyword is placeable ONLY where the profile proves it:
 *
 *   literal  — the entry's own text already contains the term (or an alias)
 *   bridged  — the evidence bridge found a same-meaning phrase AND the quote it
 *              returned exists verbatim in that entry (verifyBridges below)
 *
 * Anything else is a gap: shown to the user, forbidden to the model, and
 * rejected by the validator if it appears anyway.
 */

import type { CareerProfileFull, ProfileWorkExperience } from '@/types/careerProfile'
import { compoundsIntact, containsQuote, containsTerm, containsTermInSentence, coversContentStems, GRADE_STEMS, isAcronymIn, prepare, stems, stemsMatch, type PreparedText } from './text'
import type {
  EvidenceLocation,
  JobTargetProfile,
  KeywordEvidence,
  KeywordStatus,
  TargetKeyword,
  VerifiedBridge,
} from './types'

/** Relative importance in scoring and planning. */
export function keywordWeight(k: Pick<TargetKeyword, 'importance' | 'kind'>): number {
  const base = k.importance === 'must' ? 3 : 1
  if (k.kind === 'soft_skill') return base * 0.5
  return base
}

export function entrySourceText(e: ProfileWorkExperience): string {
  return [e.role, e.description ?? '', ...(e.highlights ?? [])].join('\n')
}

/** Profile-wide text that is not tied to one employment entry. */
export function profileWideText(profile: CareerProfileFull): string {
  return [
    profile.professional_summary ?? '',
    ...(profile.skills ?? []).map((s) => s.name),
    ...(profile.certifications ?? []).map((c) => [c.name, c.issuer ?? ''].join(' ')),
    ...(profile.education ?? []).map((e) => [e.degree, e.field_of_study ?? '', e.institution].join(' ')),
    ...(profile.additional_information ?? []).map((a) => `${a.label}: ${a.value}`),
  ].join('\n')
}

/** One line per listed item, so a multi-word requirement is matched within one item. */
function listedLines(profile: CareerProfileFull): string[] {
  return listedText(profile).split('\n').filter((l) => l.trim())
}

function listedText(profile: CareerProfileFull): string {
  return [
    ...(profile.skills ?? []).map((s) => s.name),
    ...(profile.certifications ?? []).map((c) => c.name),
    ...(profile.education ?? []).map((e) => [e.degree, e.field_of_study ?? ''].join(' ')),
    ...(profile.additional_information ?? []).map((a) => `${a.label}: ${a.value}`),
  ].join('\n')
}

/**
 * A fingerprint of everything evidence depends on. When it changes between
 * analysis and generation, cached bridges are stale and are recomputed.
 */
export function profileEvidenceKey(profile: CareerProfileFull): string {
  const entries = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => `${e.id}|${entrySourceText(e)}`)
  return [profileWideText(profile), ...entries].join('\n---\n')
}

/**
 * Keep only bridges that are real: a known keyword, a known location, and a
 * quote that exists verbatim in that location's own text. A model that
 * paraphrases its "quote" has not proven anything, and its bridge is dropped.
 */
export function verifyBridges(
  profile: CareerProfileFull,
  target: JobTargetProfile,
  raw: unknown,
): VerifiedBridge[] {
  if (!Array.isArray(raw)) return []
  const kwByLower = new Map(target.keywords.map((k) => [k.term.toLowerCase().trim(), k]))
  const entries = new Map((profile.work_experience ?? []).map((e) => [e.id, e]))
  const wide = profileWideText(profile)
  const out: VerifiedBridge[] = []
  const seen = new Set<string>()

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const r = item as Record<string, unknown>
    if (typeof r.term !== 'string' || typeof r.location !== 'string' || typeof r.quote !== 'string') continue
    const kw = kwByLower.get(r.term.toLowerCase().trim())
    if (!kw) continue
    const term = kw.term
    if (!bridgeIsPlausible(kw, r.quote)) continue
    const location = r.location.trim()
    const sourceText =
      location === 'summary' ? wide : entries.has(location) ? entrySourceText(entries.get(location)!) : null
    if (sourceText === null) continue
    if (!containsQuote(sourceText, r.quote)) continue
    const key = `${term}|${location}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ term, location, quote: r.quote.trim() })
  }
  return out
}

/**
 * The quote proves the words exist; this checks they could mean the term. The
 * quote must contain EVERY distinctive word of the requirement (or of one of its
 * exact aliases) as the same word family, or spell out its acronym. Measured on
 * live output (2026-09-17): a looser "shares one word" rule let "CRM" bridge to
 * "Key account management", "SAP FICO" to "...in SAP" and "month-end and
 * year-end closing" to "month-end close". A requirement that grades a skill
 * ("advanced Excel") is never bridged.
 *
 * Soft skills are never bridged (they are never content), and nor is a term
 * carrying a word the grounding rule bans outright.
 */
export function bridgeIsPlausible(k: Pick<TargetKeyword, 'term' | 'aliases' | 'kind'>, quote: string): boolean {
  if (k.kind === 'soft_skill') return false
  if (/\b(expert|strategic|award-winning|multidisciplinary|transformational|industry-leading|world-class|visionary|seasoned|unparalleled)\b/i.test(k.term)) return false
  if (stems(k.term).some((s) => GRADE_STEMS.has(s))) return false
  for (const v of [k.term, ...k.aliases]) {
    if (coversContentStems(v, quote) && compoundsIntact(v, quote)) return true
    if (isAcronymIn(v, quote)) return true
  }
  return false
}

const EVIDENCE_STOPWORDS = new Set(['and', 'of', 'the', 'in', 'for', 'with', 'to', 'a', 'an', 'on', 'or', 'at', 'by', 'experience', 'knowledge', 'ability', 'skill', 'strong', 'good', 'excellent', 'advanced', 'proven'])

/**
 * Local, model-free evidence: a sentence of the candidate's own text containing
 * every content word of a requirement, in any order ("Filed quarterly UAE VAT
 * returns" proves "VAT return filing"). Only for 2–4 content words, where word
 * order is the only difference; a single word is literal matching's job.
 * Words that only grade a skill ("advanced Excel") are never satisfiable here —
 * they are claims about level, not about what was done.
 */
export function sameSentenceBridges(profile: CareerProfileFull, target: JobTargetProfile): VerifiedBridge[] {
  const out: VerifiedBridge[] = []
  for (const k of target.keywords) {
    const raw = stems(k.term)
    if (raw.some((s) => GRADE_STEMS.has(s))) continue
    const words = [...new Set(raw.filter((w) => w.length > 1 && !EVIDENCE_STOPWORDS.has(w)))]
    if (words.length === 0 || words.length > 4) continue
    // A single word needs a long, specific root ("coordination"/"coordinated").
    if (words.length === 1 && words[0].length < 6) continue
    if (k.kind === 'soft_skill') continue
    for (const e of profile.work_experience ?? []) {
      const sentences = [...(e.highlights ?? []), ...(e.description ?? '').split(/(?<=[.;])\s+/)]
      const hit = sentences.find((s) => {
        const have = stems(s)
        return words.every((w) => have.some((h) => stemsMatch(w, h)))
      })
      if (hit && hit.trim()) {
        out.push({ term: k.term, location: e.id, quote: hit.trim() })
      }
    }
  }
  return out
}

export interface EvidenceMap {
  keywords: KeywordEvidence[]
  /** Terms each location may use, for the validator's allow-list. */
  approvedTerms: Map<EvidenceLocation, string[]>
}

export function buildEvidenceMap(
  profile: CareerProfileFull,
  target: JobTargetProfile | null,
  modelBridges: readonly VerifiedBridge[],
): EvidenceMap {
  let bridges: readonly VerifiedBridge[] = modelBridges
  const approvedTerms = new Map<EvidenceLocation, string[]>()
  if (!target) return { keywords: [], approvedTerms }

  // Model bridges plus local same-sentence proof, de-duplicated per location.
  const seenBridge = new Set(bridges.map((b) => `${b.term}|${b.location}`))
  bridges = [...bridges, ...sameSentenceBridges(profile, target).filter((b) => !seenBridge.has(`${b.term}|${b.location}`))]
  const entries = (profile.work_experience ?? []).map((e) => ({ id: e.id, text: prepare(entrySourceText(e)) }))
  const summaryText: PreparedText = prepare(profile.professional_summary ?? '')
  const listed: PreparedText = prepare(listedText(profile))

  // Only the spellings the quote actually proves are approved: a bridge for
  // "CPA or ACCA" proven by "ACCA" never licenses writing "CPA".
  const approve = (location: EvidenceLocation, k: TargetKeyword, quote: string) => {
    const list = approvedTerms.get(location) ?? []
    for (const v of [k.term, ...k.aliases]) {
      if (!(coversContentStems(v, quote) || isAcronymIn(v, quote))) continue
      if (!list.includes(v)) list.push(v)
    }
    approvedTerms.set(location, list)
  }

  const keywords = target.keywords.map((k): KeywordEvidence => {
    const literalEntryIds = entries.filter((e) => containsTerm(e.text, k.term, k.aliases)).map((e) => e.id)
    // Any word order within one sentence or one listed item: "B.Com Accounting"
    // is a "Bachelor's in Accounting"; "month-end close" is "month-end closing".
    const inSummary = containsTerm(summaryText, k.term, k.aliases) || containsTermInSentence(profile.professional_summary, k.term, k.aliases)
    const isListed = containsTerm(listed, k.term, k.aliases) || listedLines(profile).some((l) => containsTermInSentence(l, k.term, k.aliases))
    const own = bridges.filter((b) => b.term === k.term)

    const placeable = new Set<EvidenceLocation>()
    const anyEvidence = literalEntryIds.length > 0 || inSummary || isListed || own.length > 0
    if (anyEvidence) placeable.add('summary')
    for (const id of literalEntryIds) placeable.add(id)
    for (const b of own) placeable.add(b.location)

    // Only BRIDGED placements need an allow-list entry: literal terms already
    // pass the validator because the profile contains them.
    for (const b of own) {
      approve(b.location, k, b.quote)
      approve('summary', k, b.quote)
    }

    const status: KeywordStatus =
      inSummary || literalEntryIds.length > 0 ? 'matched' : isListed ? 'listed' : own.length > 0 ? 'supported' : 'gap'

    return {
      term: k.term,
      aliases: k.aliases,
      importance: k.importance,
      kind: k.kind,
      weight: keywordWeight(k),
      literalEntryIds,
      inSummary,
      listed: isListed,
      bridges: own,
      placeable: [...placeable],
      status,
    }
  })

  return { keywords, approvedTerms }
}
