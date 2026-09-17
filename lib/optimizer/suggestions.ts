/**
 * Suggested lines for requirements the profile does not state (2026-09-17).
 * PURE. docs/17_OPTIMIZER_ENGINE.md §6b.
 *
 * WHY. Moderate and High aim for 75–85% and 85–95% match. A profile often
 * cannot reach that on what it already states, and the founder asked for the
 * higher levels to close the gap. Writing unstated activities into a CV would
 * put claims in front of an employer that nobody confirmed. So the model DRAFTS
 * one line per missing requirement, in the same build call, and the candidate
 * decides: confirm (it goes in), edit (their words go in), or dismiss. Nothing
 * here is ever merged automatically.
 *
 * Drafts are validated in code before they are shown: a real gap, a real
 * block, plain length, no numbers (the candidate supplies their own), no
 * grading words, and no names the profile does not already contain.
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizationLevel } from '@/types/package'
import type { ResumeDocument } from '@/lib/resumeDocument'
import { extractNamedEntities } from '@/lib/ai/profileEntities'
import { BANNED_WORDS } from './qualityGate'
import { entrySourceText, profileWideText } from './evidence'
import type { KeywordEvidence } from './types'
import { hashString, wordCount } from './text'

export type SuggestionStatus = 'pending' | 'confirmed' | 'dismissed'

export interface Suggestion {
  id: string
  /** 'summary' or a profile_work_experience id. */
  block: string
  requirement: string
  text: string
  status: SuggestionStatus
}

/** Target match bands the founder set per level (2026-09-17). */
export const LEVEL_TARGET_BAND: Record<OptimizationLevel, [number, number]> = {
  easy: [60, 75],
  moderate: [75, 85],
  high: [85, 95],
}

const MAX_SUGGESTIONS: Record<OptimizationLevel, number> = { easy: 0, moderate: 6, high: 10 }

/** Which gaps get a drafted line at this level. Easy: none. Moderate: must-haves. High: all. */
export function suggestionRequirements(keywords: readonly KeywordEvidence[], level: OptimizationLevel): KeywordEvidence[] {
  if (level === 'easy') return []
  return keywords
    .filter((k) => k.status === 'gap' && k.kind !== 'soft_skill')
    .filter((k) => level === 'high' || k.importance === 'must')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_SUGGESTIONS[level])
}

/** BLOCK 4C of the build prompt. */
export function renderSuggestionRequest(
  requirements: readonly KeywordEvidence[],
  roleIds: readonly string[],
  profile: CareerProfileFull,
): string {
  const roles = (profile.work_experience ?? [])
    .filter((e) => roleIds.includes(e.id))
    .map((e) => `- [id: ${e.id}] ${e.role} at ${e.company}`)
  return [
    'These are NOT CV content and NOT facts. The candidate\'s profile does not state the requirements below.',
    'For each one, draft ONE short line the candidate could add IF it is true for them. The application shows each',
    'draft to the candidate as a question ("Did you do this?"); it is used only if they confirm it. Never put a draft',
    'into summary.generated or generated_bullets.',
    '',
    'REQUIREMENTS TO DRAFT FOR:',
    ...requirements.map((k) => `- ${k.term}${k.kind === 'certification' || k.kind === 'education' ? ' (a qualification: draft it as "Holds …")' : ''}`),
    '',
    'PLACE EACH DRAFT in "summary" (qualifications, tools, general skills) or in the single most plausible role:',
    ...(roles.length ? roles : ['- (no roles in this call — use "summary")']),
    '',
    'DRAFT RULES: past tense for activities; 8 to 25 words; plain and factual; use the requirement\'s own words;',
    'no numbers or percentages; no employer, client, project or product names; no grading words (expert, proven,',
    'extensive, strong, successfully).',
  ].join('\n')
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Keep only drafts that are safe to SHOW as a question. */
export function validateSuggestions(
  raw: unknown,
  opts: {
    profile: CareerProfileFull
    requirements: readonly KeywordEvidence[]
    roleIds: readonly string[]
  },
): Suggestion[] {
  if (!Array.isArray(raw)) return []
  const byTerm = new Map(opts.requirements.map((k) => [k.term.toLowerCase(), k]))
  const wide = [profileWideText(opts.profile), ...(opts.profile.work_experience ?? []).map(entrySourceText)].join('\n')
  const known = extractNamedEntities(wide)
  const out: Suggestion[] = []
  const seen = new Set<string>()

  for (const item of raw) {
    if (!isObject(item)) continue
    const req = typeof item.requirement === 'string' ? byTerm.get(item.requirement.trim().toLowerCase()) : undefined
    if (!req || seen.has(req.term)) continue
    const target = typeof item.for === 'string' ? item.for.trim() : typeof item.block === 'string' ? item.block.trim() : ''
    const block = target === 'summary' ? 'summary' : opts.roleIds.find((id) => id.toLowerCase() === target.toLowerCase())
    if (!block) continue
    const text = typeof item.text === 'string' ? item.text.replace(/\s+/g, ' ').trim() : ''
    const words = wordCount(text)
    if (words < 5 || words > 30) continue
    if (/\d/.test(text)) continue
    if (/\b(I|my|me|we|our)\b/.test(text)) continue
    if (BANNED_WORDS.some((w) => new RegExp(`\\b${w.replace('-', '[- ]')}\\b`, 'i').test(text))) continue
    if (/\b(proven|extensive|expert|expertise|successfully|consistently|excellent|exceptional|strong|solid|deep|proficient|hands-on|seasoned|passionate)\b/i.test(text)) continue
    // No new names: every identifiable term must already be in the profile or
    // be part of the requirement the draft is for.
    // A name built around the requirement ("NEBOSH International General
    // Certificate" for NEBOSH) is the requirement, not a stranger.
    const reqEntities = extractNamedEntities([req.term, ...req.aliases].join(' '))
    const reqWords = new Set([...reqEntities].flatMap((e) => e.split(' ')))
    // The opening verb ("Holds", "Raised") is capitalised only by position.
    const entities = [...extractNamedEntities(text.replace(/^[A-Z](?=[a-z]+\b)/,(c) => c.toLowerCase()))]
    const accepted = new Set(
      entities.filter((e) => e.includes(' ') && e.split(' ').some((w) => reqWords.has(w))).flatMap((e) => [e, ...e.split(' ')]),
    )
    const stranger = entities.find((e) => !known.has(e) && !reqEntities.has(e) && !accepted.has(e))
    if (stranger) continue
    seen.add(req.term)
    out.push({
      id: 's' + hashString(`${req.term}|${block}`),
      block,
      requirement: req.term,
      text: /[.!?]$/.test(text) ? text : text,
      status: 'pending',
    })
  }
  return out
}

/** A document with the given suggestions added — for projection and for confirmation. */
export function applySuggestionsToDocument(doc: ResumeDocument, suggestions: readonly Suggestion[]): ResumeDocument {
  if (suggestions.length === 0) return doc
  const summaryAdds = suggestions.filter((s) => s.block === 'summary').map((s) => (/[.!?]$/.test(s.text) ? s.text : `${s.text}.`))
  const byRole = new Map<string, string[]>()
  for (const s of suggestions) {
    if (s.block === 'summary') continue
    byRole.set(s.block, [...(byRole.get(s.block) ?? []), s.text])
  }
  return {
    ...doc,
    summary: summaryAdds.length ? [doc.summary, ...summaryAdds].filter((x) => x && x.trim()).join(' ') : doc.summary,
    experience: doc.experience.map((item) => {
      const adds = byRole.get(item.entry.id)
      return adds ? { ...item, bullets: [...item.bullets, ...adds] } : item
    }),
  }
}
