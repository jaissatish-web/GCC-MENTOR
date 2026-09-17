/**
 * Deterministic repair by REMOVAL (2026-09-17). PURE.
 *
 * Measured on live builds: the most common reason a good summary was thrown
 * away was one bad phrase — "Proficient in Git", "customer-facing" — in an
 * otherwise supported paragraph. A model repair often rewrote the same phrase
 * back in. This fixes it in code, and it can only make text SHORTER:
 *
 *   summary  remove every sentence that contains an offending phrase, if at
 *            least two sentences and 25 words remain
 *   bullet   cut a trailing clause that claims an unstated outcome
 *            (", ensuring…", " to maintain accurate…") at the point it starts
 *
 * Nothing is added or reworded. The result is re-validated from scratch by the
 * caller before it can be used.
 */

import { containsQuote, wordCount } from './text'

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Remove sentences carrying any offending phrase. Null when nothing (or too much) would remain. */
export function pruneSummary(summary: string, offending: readonly string[]): string | null {
  const values = offending.map((v) => v.trim()).filter((v) => v.length >= 2)
  if (values.length === 0) return null
  const sentences = splitSentences(summary)
  const hits = (s: string, v: string) =>
    containsQuote(s, v) || (v.includes(' ') ? s.toLowerCase().includes(v.toLowerCase()) : new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\  const keep = sentences.filter((s) => !values.some((v) => containsQuote(s, v) || s.toLowerCase().includes(v.toLowerCase())))')}\\b`, 'i').test(s))
  const keep = sentences.filter((s) => !values.some((v) => hits(s, v)))
  if (keep.length === sentences.length) return null
  const out = keep.join(' ')
  if (keep.length < 2 || wordCount(out) < 25) return null
  return out
}

/** Cut an unstated-outcome tail from one bullet. Null when the phrase is not found or too little remains. */
export function cutOutcomeTail(bullet: string, phrase: string): string | null {
  const p = phrase.trim().toLowerCase()
  if (p.length < 3) return null
  const lower = bullet.toLowerCase()
  const idx = lower.indexOf(p)
  if (idx <= 0) return null
  let head = bullet.slice(0, idx).replace(/[\s,;:–—-]+$/, '')
  // "…in SAP to maintain accurate records" -> drop the dangling "to"/"in order to".
  head = head.replace(/\s+(in order|so as)?\s*$/i, '')
  if (wordCount(head) < 5) return null
  return bullet.trim().endsWith('.') ? head + '.' : head
}
