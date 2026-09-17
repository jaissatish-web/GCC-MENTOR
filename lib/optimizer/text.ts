/**
 * Term matching for the optimizer engine (2026-09-17).
 *
 * PURE. No AI, no database, no server-only imports — the setup screen imports
 * the scoring half of this engine in the browser, so everything here must run
 * in both places and give the same answer.
 *
 * WHAT A MATCH IS. ATS products disagree (Taleo: literal; Lever: stemmed;
 * iCIMS/Greenhouse: semantic). We match the way a careful recruiter search
 * does, and no looser:
 *   - case-insensitive, punctuation-insensitive
 *   - light stemming, so "commissioning" finds "commissioned" and "valves"
 *     finds "valve"
 *   - an alias list per term (supplied by job analysis: "PMP" <->
 *     "Project Management Professional")
 *   - a derived acronym for multi-word terms ("Health Safety Environment" ->
 *     "hse")
 * Nothing semantic happens here. Semantic equivalence is decided once, by the
 * evidence bridge, and every bridge is verified against a verbatim quote
 * (lib/optimizer/evidence.ts) before anything trusts it.
 */

const TERM_STOPWORDS = new Set(['and', 'of', 'the', 'in', 'for', 'with', 'to', 'a', 'an', 'on', 'or', 'at', 'by'])

/**
 * British -> American spelling for the endings that differ most on CVs, so
 * "computerised"/"computerized" and "behaviour"/"behavior" are one word.
 */
function americanize(token: string): string {
  return token
    .replace(/isation(s?)$/, 'ization$1')
    .replace(/is(e|ed|es|ing)$/, (m, end) => (token.length > 6 ? 'iz' + end : m))
    .replace(/yse(d|s)?$/, (m, end) => 'yze' + (end ?? ''))
    .replace(/(avi|lab|col|fav|harb|hon|neighb|rum|vap|vig)our(s|ed|ing)?$/, (m, pre, end) => pre + 'or' + (end ?? ''))
    .replace(/tre$/, (m) => (token.length > 5 ? 'ter' : m))
}

/**
 * Degree abbreviations as written on CVs across the region, expanded so
 * "B.Sc Nursing" is evidence for "Bachelor of Science in Nursing".
 */
const DEGREES: Array<[RegExp, string]> = [
  [/\bb\.?\s?sc\b\.?/g, 'bachelor science'],
  [/\bm\.?\s?sc\b\.?/g, 'master science'],
  [/\bb\.?\s?tech\b\.?/g, 'bachelor technology'],
  [/\bm\.?\s?tech\b\.?/g, 'master technology'],
  [/\bb\.?\s?e\b\.(?=\s|$)|\bb\.e\b/g, 'bachelor engineering'],
  [/\bb\.?\s?com\b\.?/g, 'bachelor commerce'],
  [/\bm\.?\s?com\b\.?/g, 'master commerce'],
  [/\bbba\b/g, 'bachelor business administration'],
  [/\bmba\b/g, 'master business administration'],
  [/\bb\.?\s?a\b\.(?=\s|$)/g, 'bachelor arts'],
  [/\bbachelors?\b|\bbachelor's\b/g, 'bachelor'],
  [/\bmasters?\b|\bmaster's\b/g, 'master'],
]

/** Lowercase tokens that keep programming-style identifiers intact: c++, c#, .net, node.js, iso-9001. */
export function tokenize(text: string | null | undefined): string[] {
  if (!text) return []
  let lower = text.toLowerCase().replace(/[‘’`']/g, '')
  if (/\b(b|m)\.?\s?(sc|tech|e|com|a)\b|\bbba\b|\bmba\b|bachelor|master/.test(lower)) {
    for (const [re, full] of DEGREES) lower = lower.replace(re, ` ${full} `)
  }
  const out: string[] = []
  for (const m of lower.matchAll(/\.?[a-z0-9][a-z0-9+#.]*/g)) {
    let t = m[0]
    // Sentence punctuation is not part of a token; ".net" keeps its dot.
    while (t.length > 1 && t.endsWith('.')) t = t.slice(0, -1)
    if (t) out.push(/^[a-z]+$/.test(t) ? americanize(t) : t)
  }
  return out
}

/** Light, predictable English stemming. Deliberately conservative: a wrong merge is a false match. */
export function stem(token: string): string {
  let t = token
  if (t.length <= 3 || /[^a-z]/.test(t)) return t
  if (t.endsWith('ies') && t.length > 4) return t.slice(0, -3) + 'y'
  if (t.endsWith('ing') && t.length > 5) {
    t = t.slice(0, -3)
    if (/(.)\1$/.test(t) && !/(ll|ss|zz)$/.test(t)) t = t.slice(0, -1)
    return t.endsWith('e') ? t.slice(0, -1) : t
  }
  if (t.endsWith('ed') && t.length > 4) {
    t = t.slice(0, -2)
    if (/(.)\1$/.test(t) && !/(ll|ss|zz)$/.test(t)) t = t.slice(0, -1)
    return t.endsWith('e') ? t.slice(0, -1) : t
  }
  if (t.endsWith('es') && /(ss|sh|ch|x|z)es$/.test(t)) return t.slice(0, -2)
  if (t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is')) t = t.slice(0, -1)
  return t.endsWith('e') ? t.slice(0, -1) : t
}

export function stems(text: string | null | undefined): string[] {
  return tokenize(text).map(stem)
}

/** Content stems of a term, stopwords removed. "Health, Safety and Environment" -> [health, safety, environment]. */
function termStems(term: string): string[] {
  return tokenize(term).filter((t) => !TERM_STOPWORDS.has(t)).map(stem)
}

/** "Health Safety and Environment" -> "hse". Only for 3+ content words, where an acronym is identifying. */
export function deriveAcronym(term: string): string | null {
  const words = tokenize(term).filter((t) => !TERM_STOPWORDS.has(t) && /^[a-z]/.test(t))
  if (words.length < 3 || words.length > 6) return null
  return words.map((w) => w[0]).join('')
}

/** Every spelling a term may appear under: itself, its aliases, and a derived acronym. */
export function termVariants(term: string, aliases: readonly string[] = []): string[] {
  const out = new Set<string>()
  for (const v of [term, ...aliases]) {
    const clean = v.trim()
    if (clean) out.add(clean)
  }
  const acronym = deriveAcronym(term)
  if (acronym) out.add(acronym)
  return [...out]
}

/** A prepared haystack, so one text can be searched for many terms without re-tokenising. */
export interface PreparedText {
  stems: string[]
  joined: string
}

export function prepare(text: string | null | undefined): PreparedText {
  const s = stems(text)
  return { stems: s, joined: ` ${s.join(' ')} ` }
}

/**
 * Does the prepared text contain this term (or one of its variants)?
 * A multi-word variant must appear as a contiguous run of stems — "project
 * management" does not match "project cost management".
 */
export function containsTerm(text: PreparedText, term: string, aliases: readonly string[] = []): boolean {
  for (const variant of termVariants(term, aliases)) {
    const parts = termStems(variant)
    if (parts.length === 0) continue
    if (text.joined.includes(` ${parts.join(' ')} `)) return true
  }
  return false
}

/**
 * Every content word of the term (or an alias), as the same word family, inside
 * ONE sentence of the text: "monitored hemodynamic status every hour" contains
 * "hemodynamic monitoring"; "Coordinated shop drawings" contains "coordination".
 * Looser than containsTerm, which needs the words in order.
 */
export function containsTermInSentence(text: string | null | undefined, term: string, aliases: readonly string[] = []): boolean {
  if (!text) return false
  const sentences = text.split(/(?<=[.;!?])\s+|\n+/)
  for (const variant of termVariants(term, aliases)) {
    // A hyphenated compound is ONE unit: "year-end" must appear as "year-end"
    // (or "year end"), never as "6+ years … month-end" (measured 2026-09-17).
    const groups = variant
      .split(/\s+/)
      .map((g) => tokenize(g).filter((t) => !TERM_STOPWORDS.has(t)).map(stem))
      .filter((g) => g.length > 0 && !(g.length === 1 && g[0].length <= 1))
    const total = groups.reduce((n, g) => n + g.length, 0)
    if (groups.length === 0 || total > 5) continue
    for (const s of sentences) {
      const have = stems(s)
      const ok = groups.every((g) => {
        if (g.length === 1) return have.some((h) => stemsMatch(g[0], h))
        for (let i = 0; i + g.length <= have.length; i++) {
          if (g.every((w, j) => stemsMatch(w, have[i + j]))) return true
        }
        return false
      })
      if (ok) return true
    }
  }
  return false
}

export function containsTermRaw(text: string | null | undefined, term: string, aliases: readonly string[] = []): boolean {
  return containsTerm(prepare(text), term, aliases)
}

/** Whitespace/case-insensitive verbatim check — how a bridge quote is proven to exist. */
export function containsQuote(haystack: string | null | undefined, quote: string | null | undefined): boolean {
  if (!haystack || !quote) return false
  const norm = (s: string) => s.toLowerCase().replace(/[‘’`']/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
  const q = norm(quote)
  if (q.length < 3) return false
  return norm(haystack).includes(q)
}

/**
 * Words too broad to prove anything on their own: "account management" and
 * "relationship management" share "management" and mean different things.
 */
const GENERIC_STEMS = new Set(
  ['management', 'manager', 'manage', 'skill', 'skills', 'experience', 'system', 'systems', 'service', 'services',
    'work', 'team', 'knowledge', 'ability', 'development', 'engineering', 'engineer', 'support', 'operation',
    'operations', 'process', 'processes', 'activity', 'activities', 'solution', 'solutions', 'business', 'strong',
    'excellent', 'good', 'effective', 'general', 'various', 'related', 'professional', 'industry', 'standard',
    'standards', 'high', 'quality', 'level', 'data', 'report', 'reports', 'planning', 'plan', 'customer',
    'customers', 'client', 'clients', 'project', 'projects', 'site', 'degree', 'certification', 'certificate',
    'role', 'environment'].map((w) => stems(w)[0]),
)

/** Content stems a claim rests on: no stopwords, no generic words. */
export function contentStems(text: string): string[] {
  return [...new Set(tokenize(text).filter((t) => !TERM_STOPWORDS.has(t)).map(stem))].filter(
    (s) => s.length > 1 && !GENERIC_STEMS.has(s),
  )
}

export function stemsMatch(a: string, b: string): boolean {
  if (a === b) return true
  // "ventilation"/"ventilated", "administration"/"administered": a shared
  // six-letter root is the same word family.
  return a.length >= 6 && b.length >= 6 && a.slice(0, 6) === b.slice(0, 6)
}

/**
 * Words that grade a skill rather than name it. A requirement carrying one
 * ("advanced Excel", "expert-level SQL") is a claim about level that no
 * sentence of past duties proves.
 */
export const GRADE_STEMS = new Set(['advanc', 'expert', 'proficien', 'proficient', 'fluent', 'senior', 'master', 'excellent', 'strong', 'deep', 'extensive', 'solid', 'expertise'])

/** Is every distinctive word of `term` present, as the same word family, in `text`? */
export function coversContentStems(term: string, text: string): boolean {
  const want = contentStems(term)
  if (want.length === 0) return false
  const have = contentStems(text)
  return want.every((w) => have.some((h) => stemsMatch(w, h)))
}

/** Do two texts share a non-generic word family? */
export function sharesContentStem(a: string, b: string): boolean {
  const as = contentStems(a)
  const bs = contentStems(b)
  return as.some((x) => bs.some((y) => stemsMatch(x, y)))
}

/** The words in `long` that `short` abbreviates, or null. "CMMS" -> "computerized maintenance management system". */
export function acronymExpansion(short: string, long: string): string | null {
  const s = short.replace(/[^a-z0-9]/gi, '').toLowerCase()
  if (s.length < 2 || s.length > 8 || !/^[a-z]+$/.test(s)) return null
  const words = tokenize(long).filter((t) => !TERM_STOPWORDS.has(t) && /^[a-z]/.test(t))
  for (let i = 0; i + s.length <= words.length; i++) {
    const run = words.slice(i, i + s.length)
    if (run.map((w) => w[0]).join('') === s) return run.join(' ')
  }
  return null
}

/** Is `short` the initials of consecutive words in `long`? ("CMMS" in "computerised maintenance management system") */
export function isAcronymIn(short: string, long: string): boolean {
  const s = short.replace(/[^a-z0-9]/gi, '').toLowerCase()
  if (s.length < 2 || s.length > 8 || !/^[a-z]+$/.test(s)) return false
  const words = tokenize(long).filter((t) => !TERM_STOPWORDS.has(t) && /^[a-z]/.test(t))
  for (let i = 0; i + s.length <= words.length; i++) {
    if (words.slice(i, i + s.length).map((w) => w[0]).join('') === s) return true
  }
  return false
}

export function wordCount(text: string | null | undefined): number {
  return (text ?? '').split(/\s+/).filter(Boolean).length
}

/** Stable, dependency-free string hash (FNV-1a, 32-bit, hex). Not cryptographic — a cache key. */
export function hashString(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
