/**
 * Category bridges (2026-09-18). PURE.
 *
 * A job asks for a CATEGORY ("international Oil & Gas codes", "electrical
 * standards"); a CV names MEMBERS of it ("Saudi Aramco SAES", "Shell DEP",
 * "API", "IEC 61511"). Neither the literal match nor a same-sentence bridge can
 * see that they are the same claim, so the audit's I&C CV was told it lacked
 * "Oil & Gas codes" while listing four of them.
 *
 * The table is deliberately small and literal: each category names the
 * standards that belong to it, and a bridge is made only when one of those
 * names appears verbatim in the profile. The quote is that verbatim name, so
 * the bridge is as provable as any other.
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import type { JobTargetProfile, VerifiedBridge } from './types'
import { entrySourceText } from './evidence'

interface Category {
  /** Matches the requirement's term. */
  term: RegExp
  /** Named members, matched case-insensitively as whole tokens. */
  members: RegExp
}

const CATEGORIES: Category[] = [
  {
    term: /\b(oil\s*(&|and)\s*gas|petroleum|petrochemical|refinery|upstream|downstream)\b.*\b(codes?|standards?|specifications?|regulations?)\b|\b(codes?|standards?)\b.*\b(oil\s*(&|and)\s*gas|petroleum)\b/i,
    members: /\b(api(?:\s?(?:rp\s?)?\d{2,4})?|asme(?:\s?b\d{2}(?:\.\d+)?)?|saes|saep|samss|shell dep|dep\s?\d{2}|adnoc(?: gi| agi)?|nace|iec 6150[89]|iec 61511|isa[- ]?84|nfpa\s?\d{1,4}|iogp|ogp|norsok)\b/i,
  },
  {
    term: /\b(international|industry|engineering)\s+(codes?|standards?)\b/i,
    members: /\b(iec\s?\d{3,5}|iso\s?\d{3,5}|api(?:\s?\d{2,4})?|asme|isa(?:[- ]?\d{1,3})?|nfpa\s?\d{1,4}|bs\s?en|en\s?\d{3,5}|ieee\s?\d{2,4}|astm)\b/i,
  },
  {
    term: /\belectrical\s+(codes?|standards?|regulations?)\b/i,
    members: /\b(iec\s?\d{3,5}|nec|nfpa\s?70e?|bs\s?7671|ieee\s?\d{2,4}|iet wiring)\b/i,
  },
  {
    term: /\b(functional safety|safety instrumented|sil)\s+(codes?|standards?)\b|\bsafety standards?\b/i,
    members: /\b(iec 6150[89]|iec 61511|isa[- ]?84|osha|iso 45001|nebosh|iosh)\b/i,
  },
  {
    term: /\b(construction|building|civil|structural)\s+(codes?|standards?)\b/i,
    members: /\b(ibc|aci\s?\d{3}|aisc|eurocodes?|bs\s?\d{3,5}|qcs(?:\s?20\d\d)?|sbc\s?\d{3}|dubai municipality)\b/i,
  },
]

/**
 * Bridges for category requirements, one per location whose text names a
 * member. Work entries bridge at their own id; skills, certifications and
 * additional information bridge at 'summary' (profile-wide), matching how the
 * evidence map treats listed items.
 */
export function categoryBridges(profile: CareerProfileFull, target: JobTargetProfile): VerifiedBridge[] {
  const out: VerifiedBridge[] = []
  const listed = [
    ...(profile.skills ?? []).map((s) => s.name),
    ...(profile.certifications ?? []).map((c) => c.name),
    ...(profile.additional_information ?? []).map((a) => a.value),
  ].join('\n')

  for (const k of target.keywords) {
    const cat = CATEGORIES.find((c) => c.term.test(k.term))
    if (!cat) continue
    for (const e of profile.work_experience ?? []) {
      const m = cat.members.exec(entrySourceText(e))
      if (m) out.push({ term: k.term, location: e.id, quote: m[0] })
    }
    const m = cat.members.exec(listed)
    if (m) out.push({ term: k.term, location: 'summary', quote: m[0] })
  }
  return out
}
