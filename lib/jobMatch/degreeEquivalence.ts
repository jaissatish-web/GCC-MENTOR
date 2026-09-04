/**
 * Degree equivalence — level plus field, not exact strings.
 *
 * WHY (open items §B1, second half): education scored by case-insensitive
 * substring match, so a job asking for a "B.Eng in Mechanical Engineering" did
 * not match a candidate holding a "B.Tech in Mechanical Engineering". They are
 * the same qualification. The Indian degree naming a Gulf employer's advert
 * does not use is the single most common form of this, and it is exactly our
 * audience.
 *
 * Founder decision 2026-09-04: match on LEVEL + FIELD. Explicitly rejected was
 * matching on level alone, which would have scored an arts graduate as fully
 * qualified for a piping engineer role.
 *
 * TWO RULES SHAPE EVERYTHING BELOW:
 *
 * 1. **A higher qualification satisfies a lower requirement.** A master's in
 *    mechanical engineering meets a requirement for a bachelor's in mechanical
 *    engineering. The reverse is never true.
 * 2. **A named discipline must actually overlap.** "Bachelor's in Engineering"
 *    with no discipline is satisfied by any engineering bachelor's; "Bachelor's
 *    in Mechanical Engineering" is not satisfied by an electrical one.
 *
 * THIS IS ADDITIVE. The caller keeps its original substring match and takes the
 * UNION of the two, so nothing that scored before can stop scoring now. This
 * module can only ever find matches, never remove them.
 */

export type DegreeLevel = 'certificate' | 'diploma' | 'bachelor' | 'master' | 'doctorate'

const LEVEL_RANK: Record<DegreeLevel, number> = {
  certificate: 1,
  diploma: 2,
  bachelor: 3,
  master: 4,
  doctorate: 5,
}

/**
 * Level terms, longest and most specific first — "master of engineering" must
 * win before the bare "m.e", and "b.tech" before "b.e".
 */
const LEVEL_TERMS: Array<[DegreeLevel, string[]]> = [
  ['doctorate', ['doctorate', 'doctoral', 'ph d', 'phd', 'd phil', 'dphil', 'd sc', 'dsc']],
  ['master', [
    'master of', 'masters', 'master', 'post graduate', 'postgraduate', 'pg diploma',
    'm tech', 'mtech', 'm e', 'm eng', 'meng', 'm sc', 'msc', 'm s',
    'mba', 'mca', 'm com', 'mcom', 'm a', 'm phil', 'mphil',
  ]],
  ['bachelor', [
    'bachelor of', 'bachelors', 'bachelor', 'under graduate', 'undergraduate',
    'b tech', 'btech', 'b e', 'b eng', 'beng', 'b sc', 'bsc', 'b s',
    'bba', 'bca', 'b com', 'bcom', 'b a', 'b arch', 'barch', 'b pharm',
    'degree in engineering', 'engineering degree', 'graduate degree', 'graduation',
  ]],
  ['diploma', ['diploma', 'polytechnic', 'associate degree', 'associate of', 'hnd', 'higher national diploma', 'advanced diploma']],
  ['certificate', ['certificate', 'certification course', 'iti', 'vocational', 'high school', 'secondary school', 'hsc', 'ssc', 'intermediate']],
]

/**
 * Disciplines. `engineering` is the PARENT term: a requirement that names only
 * "engineering" is met by any discipline in ENGINEERING_FIELDS.
 */
const FIELD_TERMS: Array<[string, string[]]> = [
  ['mechanical', ['mechanical', 'mech']],
  ['electrical', ['electrical', 'elect']],
  ['instrumentation', ['instrumentation', 'instrument', 'control and instrumentation', 'e and i', 'e i']],
  ['electronics', ['electronics', 'electronic', 'ece', 'communication engineering', 'telecommunication']],
  ['civil', ['civil', 'structural']],
  ['chemical', ['chemical', 'process engineering']],
  ['petroleum', ['petroleum', 'petrochemical', 'oil and gas', 'reservoir']],
  ['piping', ['piping', 'pipeline']],
  ['computer', ['computer science', 'computer', 'information technology', 'software', 'cse', 'it']],
  ['industrial', ['industrial engineering', 'production', 'manufacturing', 'mechatronics']],
  ['marine', ['marine', 'naval architecture']],
  ['aeronautical', ['aeronautical', 'aerospace', 'aviation']],
  ['automobile', ['automobile', 'automotive']],
  ['metallurgy', ['metallurgy', 'metallurgical', 'materials science']],
  ['mining', ['mining']],
  ['environmental', ['environmental', 'hse', 'health safety and environment', 'occupational safety']],
  ['architecture', ['architecture', 'architectural']],
  ['business', ['business administration', 'business', 'management', 'commerce', 'finance', 'accounting', 'economics']],
  ['science', ['physics', 'chemistry', 'mathematics', 'biology', 'statistics']],
  ['arts', ['arts', 'humanities', 'literature', 'history', 'sociology', 'psychology']],
  ['law', ['law', 'legal studies']],
  ['medicine', ['medicine', 'medical', 'nursing', 'pharmacy', 'dentistry']],
]

const ENGINEERING_FIELDS: string[] = [
  'mechanical', 'electrical', 'instrumentation', 'electronics', 'civil', 'chemical',
  'petroleum', 'piping', 'computer', 'industrial', 'marine', 'aeronautical', 'automobile',
  'metallurgy', 'mining', 'environmental',
]

/**
 * Normalise for matching: lowercase, and every non-letter run becomes a single
 * space. This is what lets "B.Tech", "B Tech", "B-Tech" and "BTech" all reduce
 * to the same token — the punctuation in degree abbreviations is exactly what
 * defeated the old substring comparison.
 */
function normalize(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z]+/g, ' ').trim()} `
}

function hasTerm(normalized: string, term: string): boolean {
  return normalized.includes(` ${term.replace(/[^a-z]+/g, ' ').trim()} `)
}

export interface DegreeShape {
  level: DegreeLevel | null
  fields: string[]
  /** True when the text names engineering generically and no specific discipline. */
  genericEngineering: boolean
}

export function parseDegree(text: string): DegreeShape {
  const n = normalize(text)

  let level: DegreeLevel | null = null
  outer: for (const [lvl, terms] of LEVEL_TERMS) {
    for (const t of terms) {
      if (hasTerm(n, t)) { level = lvl; break outer }
    }
  }

  const fields: string[] = []
  for (const [field, terms] of FIELD_TERMS) {
    if (terms.some((t) => hasTerm(n, t))) fields.push(field)
  }

  const namesEngineering = hasTerm(n, 'engineering') || hasTerm(n, 'engineer')
  const genericEngineering =
    namesEngineering && !fields.some((f) => ENGINEERING_FIELDS.indexOf(f) !== -1)

  return { level, fields, genericEngineering }
}

/**
 * Does this candidate qualification satisfy this stated requirement?
 *
 * A requirement that names no level and no field is not treated as satisfied by
 * anything — it carries no information to match against, and returning true
 * would hand out free points for an unparseable line.
 */
export function satisfiesRequirement(candidate: string, requirement: string): boolean {
  const req = parseDegree(requirement)
  const cand = parseDegree(candidate)

  const reqHasField = req.fields.length > 0 || req.genericEngineering
  if (!req.level && !reqHasField) return false

  // Level: a higher qualification satisfies a lower requirement, never the reverse.
  if (req.level) {
    if (!cand.level) return false
    if (LEVEL_RANK[cand.level] < LEVEL_RANK[req.level]) return false
  }

  if (!reqHasField) return true

  // "Engineering" with no discipline named: any engineering discipline satisfies it.
  if (req.genericEngineering) {
    return cand.genericEngineering || cand.fields.some((f) => ENGINEERING_FIELDS.indexOf(f) !== -1)
  }

  // A named discipline must actually overlap. A candidate whose degree names
  // engineering generically does NOT satisfy a specific discipline requirement.
  return req.fields.some((f) => cand.fields.indexOf(f) !== -1)
}

/** True when any of the candidate's qualifications satisfies the requirement. */
export function anySatisfiesRequirement(candidateDegrees: string[], requirement: string): boolean {
  return candidateDegrees.some((c) => satisfiesRequirement(c, requirement))
}
