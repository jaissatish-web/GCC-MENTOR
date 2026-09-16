/**
 * The ONE place a model-returned skill ordering is interpreted (2026-09-16).
 *
 * Skill order is presentation metadata, not a grounding fact: the model may
 * rank the candidate's skills, never add, rename or remove one. Until this
 * module the validator demanded an exact permutation and failed the whole
 * resume otherwise, while the route's own resolver already knew how to repair
 * the same input — two different recognition rules for one field, and the
 * stricter one ran first. Production hit it on 2026-09-16: a 49-skill profile
 * returned HTTP 502 on four consecutive builds because the model omitted
 * skills from its list.
 *
 * Both lib/ai/validateGrounding.ts and app/api/optimize/route.ts now call
 * normalizeSkillsOrder(), so validation and persistence cannot disagree.
 *
 * Recognition rules, and only these:
 *   - an exact skill id (surrounding whitespace ignored);
 *   - an existing skill name, trimmed and case-insensitive.
 * No fuzzy matching, no partial names, no synonyms. Anything else is ignored,
 * so an invented or renamed skill can never be rendered.
 *
 * PII: RepairCode values are fixed strings and safe to log. Nothing in the
 * result echoes a model value or a skill name except `order`, which is ids.
 */

export interface SkillRef {
  id: string
  name: string
  sort_order: number
}

export type SkillsOrderRepairCode =
  /** skills_order absent, or null. */
  | 'skills_order_missing'
  /** Present but not an array. */
  | 'skills_order_malformed'
  /** An array whose entries matched no profile skill (includes empty). */
  | 'skills_order_no_recognized'
  /** Some entries were not strings or matched no profile skill. */
  | 'skills_order_unknown_values'
  /** The same profile skill appeared more than once. */
  | 'skills_order_duplicates'
  /** Some profile skills were omitted and appended in profile order. */
  | 'skills_order_incomplete'
  /** Skills were referenced by name rather than id. Mapped, not a defect. */
  | 'skills_order_names_used'

export interface SkillsOrderResult {
  /** Every profile skill id exactly once: recognized model order first, then the rest by sort_order. */
  order: string[]
  /** Safe-to-log codes. Empty when the model returned a clean id permutation. */
  codes: SkillsOrderRepairCode[]
  /** True when the order had to be repaired (name mapping alone is not a repair). */
  repaired: boolean
}

const normName = (s: string) => s.trim().toLowerCase()

export function normalizeSkillsOrder(
  skills: readonly SkillRef[],
  raw: unknown,
): SkillsOrderResult {
  const profileOrder = skills.slice().sort((a, b) => a.sort_order - b.sort_order)
  const codes = new Set<SkillsOrderRepairCode>()

  const byId = new Map(profileOrder.map((s) => [s.id, s.id]))
  // Two skills can share a name after normalisation; each occurrence claims
  // the next unused one in profile order, so neither can be lost or doubled.
  const byName = new Map<string, string[]>()
  for (const s of profileOrder) {
    const key = normName(s.name)
    byName.set(key, [...(byName.get(key) ?? []), s.id])
  }

  const order: string[] = []
  const seen = new Set<string>()

  if (raw === undefined || raw === null) {
    codes.add('skills_order_missing')
  } else if (!Array.isArray(raw)) {
    codes.add('skills_order_malformed')
  } else {
    for (const item of raw) {
      if (typeof item !== 'string') {
        codes.add('skills_order_unknown_values')
        continue
      }
      const idHit = byId.get(item.trim())
      if (idHit) {
        if (seen.has(idHit)) codes.add('skills_order_duplicates')
        else {
          order.push(idHit)
          seen.add(idHit)
        }
        continue
      }
      const candidates = byName.get(normName(item))
      if (candidates) {
        codes.add('skills_order_names_used')
        const next = candidates.find((id) => !seen.has(id))
        if (next) {
          order.push(next)
          seen.add(next)
        } else codes.add('skills_order_duplicates')
        continue
      }
      codes.add('skills_order_unknown_values')
    }
    if (order.length === 0 && profileOrder.length > 0) codes.add('skills_order_no_recognized')
  }

  for (const s of profileOrder) {
    if (!seen.has(s.id)) {
      // Only an incomplete list we actually read counts as "incomplete"; a
      // missing or unusable list is already described by its own code.
      if (order.length > 0) codes.add('skills_order_incomplete')
      order.push(s.id)
      seen.add(s.id)
    }
  }

  // An empty profile has nothing to order, so nothing can be wrong with it.
  if (profileOrder.length === 0) codes.clear()

  const list = [...codes]
  return {
    order,
    codes: list,
    repaired: list.some((c) => c !== 'skills_order_names_used'),
  }
}
