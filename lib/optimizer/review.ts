/**
 * Independent fact-check review (2026-09-17). Prompt + parser; PURE.
 *
 * Code catches invented numbers, imported requirements, banned words and
 * authority verbs. It cannot read meaning: "supported the shutdown" rewritten as
 * "delivered the shutdown", or a team result restated as a personal one. A
 * second model call, told only to find unsupported claims, closes that gap —
 * the "evaluator agent" layer that took hallucinations from 2.48–5.36 to
 * 0.04–0.24 per resume in arXiv 2607.01457.
 *
 * FALSE POSITIVES ARE CONTAINED. Every issue must quote the rewrite verbatim;
 * an issue whose quote is not in that block's text is discarded. A surviving
 * issue triggers ONE repair of that block and, failing that, the block keeps
 * the candidate's own text — never a failed resume.
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import { entrySourceText, profileWideText } from './evidence'
import { containsQuote } from './text'

export const REVIEW_SYSTEM_PROMPT = `You are an uncompromising fact-checker for CV rewrites. For each REWRITE you compare it with its SOURCE and report every claim the SOURCE does not support.

Report an issue when the REWRITE:
- states an achievement, outcome, responsibility, scope, tool, standard, client or number the SOURCE does not state
- raises the level of involvement ("assisted" -> "delivered", "part of a team" -> "led", "exposure" -> "proficient")
- turns a team or project result into the candidate's personal result
- moves a fact from one role to another (each role may use only its own SOURCE; the SUMMARY may use the whole profile)
- claims a total or duration of experience the SOURCE does not state
- grades the candidate with words the SOURCE does not use ("proven", "strong background", "extensive", "consistently", "in a competitive environment")
- turns a single result into a repeated one ("achieved 112% in 2023" -> "consistently exceeded targets")

Do NOT report:
- rewording, reordering, tighter phrasing, or a different sentence structure that keeps the meaning
- a summary describing duties the SOURCE shows the candidate performed as experience ("Experienced in preparing IFRS financial statements" from "Prepared monthly financial statements under IFRS"), or naming a listed skill as a skill
- a change of tense
- an employer-specific term listed under APPROVED TERMS for that block (already verified against the source)
- style preferences

Every issue must include "quote": the exact words from the REWRITE (3–15 words) that make the unsupported claim, copied character for character.

Respond with ONLY one JSON object, no prose, no markdown fences:
{ "issues": [ { "block": <"summary" or the role id>, "quote": <verbatim words from the rewrite>, "reason": <one short sentence> } ] }
Return { "issues": [] } when every rewrite is supported.`

export interface ReviewBlock {
  /** 'summary' or a profile_work_experience id. */
  block: string
  rewrite: string[]
  approvedTerms: string[]
}

export function buildReviewUserPrompt(profile: CareerProfileFull, blocks: ReviewBlock[]): string {
  const entries = new Map((profile.work_experience ?? []).map((e) => [e.id, e]))
  const parts: string[] = []
  for (const b of blocks) {
    let source: string
    let label: string
    if (b.block === 'summary') {
      label = 'SUMMARY'
      source = [profileWideText(profile), ...[...entries.values()].map((e) => `${e.role} at ${e.company}\n${entrySourceText(e)}`)].join('\n\n')
    } else {
      const e = entries.get(b.block)
      if (!e) continue
      label = `ROLE ${b.block} — ${e.role} at ${e.company}`
      source = entrySourceText(e)
    }
    parts.push(
      `=== BLOCK: ${b.block} (${label}) ===\nSOURCE:\n${source}\n\nREWRITE:\n${b.rewrite.map((r) => `- ${r}`).join('\n')}` +
        (b.approvedTerms.length ? `\n\nAPPROVED TERMS: ${b.approvedTerms.join('; ')}` : ''),
    )
  }
  return parts.join('\n\n')
}

export interface ReviewIssue {
  block: string
  quote: string
  reason: string
}

/** Keep only issues that point at a real block and quote its rewrite verbatim. */
export function parseReview(raw: unknown, blocks: ReviewBlock[]): ReviewIssue[] {
  if (typeof raw !== 'object' || raw === null) return []
  const list = (raw as Record<string, unknown>).issues
  if (!Array.isArray(list)) return []
  const byBlock = new Map(blocks.map((b) => [b.block, b.rewrite.join('\n')]))
  const out: ReviewIssue[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue
    const r = item as Record<string, unknown>
    if (typeof r.block !== 'string' || typeof r.quote !== 'string') continue
    const text = byBlock.get(r.block.trim())
    if (!text || !containsQuote(text, r.quote)) continue
    out.push({ block: r.block.trim(), quote: r.quote.trim(), reason: typeof r.reason === 'string' ? r.reason.slice(0, 300) : '' })
  }
  return out
}
