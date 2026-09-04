import type { TargetCountry } from '@/types/careerProfile'

/**
 * Read a GCC country out of the free-text location a resume states for a job.
 *
 * WHY THIS EXISTS (open items §B1, the highest-value defect in the product):
 * the `gcc_experience` category counted only work entries carrying a
 * `gcc_country` value, and that column is written by exactly one thing — a
 * dropdown in the profile editor. An anonymous visitor never touches it, so on
 * the free funnel the category was **structurally always zero, whatever the CV
 * said.** Measured: a CV with 12 years in Abu Dhabi and Jubail, against a
 * matching Senior Piping Engineer job description, scored 48/100 with three
 * categories at zero, while the semantic layer scored the same candidate
 * 85/95/100.
 *
 * Extraction has always returned a free-text `location` per work entry —
 * "Abu Dhabi, UAE" was already reaching us and simply nothing read it.
 *
 * THIS DOES NOT WEAKEN THE GROUNDING RULE, and the distinction is the whole
 * design. It reads a fact the resume literally states and translates it into
 * the vocabulary the scorer already uses. It never guesses from an employer's
 * name, a nationality, a phone country code, or a job title — those are
 * inferences about the candidate, which is exactly what the product forbids.
 * If the resume does not say where the job was, the answer stays null.
 *
 * Founder decision 2026-09-04: derive from the resume's own words, including
 * city names, because city-only is how real Gulf CVs are written ("Jubail",
 * "Dubai") and requiring a spelled-out country name would leave most of them
 * undercounted — the same defect in a smaller size.
 */

/** Country names and the abbreviations that appear on real CVs. */
const COUNTRY_TERMS: Array<[TargetCountry, string[]]> = [
  ['saudi_arabia', ['saudi arabia', 'saudi', 'ksa', 'k s a', 'kingdom of saudi arabia']],
  ['uae', ['united arab emirates', 'uae', 'u a e', 'emirates']],
  ['qatar', ['qatar', 'state of qatar']],
  ['oman', ['oman', 'sultanate of oman']],
  ['kuwait', ['kuwait', 'state of kuwait']],
  ['bahrain', ['bahrain', 'kingdom of bahrain']],
]

/**
 * Cities and industrial sites, which is how Gulf work history is usually
 * written. Deliberately conservative: entries whose name is also an ordinary
 * English word or a common substring are LEFT OUT rather than risk reading a
 * Gulf posting into a CV that has none. "Hail" (Saudi) and "Sur" (Oman) are
 * the two omitted for that reason — both are real cities and both would fire
 * on ordinary prose.
 */
const CITY_TERMS: Array<[TargetCountry, string[]]> = [
  ['saudi_arabia', [
    'riyadh', 'jeddah', 'jedda', 'dammam', 'jubail', 'al jubail', 'khobar', 'al khobar', 'dhahran',
    'yanbu', 'rabigh', 'ras tanura', 'mecca', 'makkah', 'medina', 'madinah', 'tabuk', 'abha',
    'khamis mushait', 'buraidah', 'qassim', 'najran', 'jazan', 'jizan', 'hofuf', 'al ahsa', 'ahsa',
    'taif', 'neom', 'shaybah', 'khafji', 'jazan economic city', 'king abdullah economic city',
  ]],
  ['uae', [
    'dubai', 'abu dhabi', 'abudhabi', 'sharjah', 'ajman', 'fujairah', 'ras al khaimah', 'rak',
    'umm al quwain', 'al ain', 'ruwais', 'jebel ali', 'musaffah', 'mussafah', 'khalifa city',
    'dubai marina', 'jafza', 'kizad', 'das island',
  ]],
  ['qatar', [
    'doha', 'ras laffan', 'mesaieed', 'messaieed', 'al khor', 'dukhan', 'lusail', 'al wakrah',
    'umm said', 'al rayyan',
  ]],
  ['oman', [
    'muscat', 'salalah', 'sohar', 'duqm', 'nizwa', 'barka', 'sohar port', 'fahud', 'ibri',
  ]],
  ['kuwait', [
    'kuwait city', 'ahmadi', 'al ahmadi', 'shuaiba', 'shuwaikh', 'mina abdullah', 'mina al ahmadi',
    'farwaniya', 'hawalli', 'jahra', 'subhan',
  ]],
  ['bahrain', [
    'manama', 'riffa', 'muharraq', 'sitra', 'isa town', 'hidd', 'budaiya',
  ]],
]

/** Phrases that place the work in the Gulf without naming which country. */
const GENERIC_GULF_TERMS = [
  'gcc', 'gulf', 'arabian gulf', 'persian gulf', 'gulf region', 'gulf countries',
  'middle east', 'mena',
]

/**
 * Countries that are NOT GCC. Their presence, with no GCC country named
 * alongside, vetoes a city match — so "Sharjah Road, Karachi, Pakistan" does
 * not become UAE experience. Yemen, Iraq and Iran are listed deliberately:
 * Middle East is not the GCC.
 */
const NON_GCC_COUNTRY_TERMS = [
  'india', 'pakistan', 'bangladesh', 'nepal', 'sri lanka', 'philippines', 'indonesia', 'malaysia',
  'singapore', 'china', 'japan', 'south korea', 'thailand', 'vietnam', 'myanmar',
  'egypt', 'jordan', 'lebanon', 'syria', 'iraq', 'iran', 'turkey', 'yemen', 'israel',
  'united states', 'usa', 'canada', 'mexico', 'brazil',
  'united kingdom', 'england', 'scotland', 'ireland', 'germany', 'france', 'italy', 'spain',
  'netherlands', 'belgium', 'norway', 'sweden', 'denmark', 'poland', 'russia', 'ukraine',
  'australia', 'new zealand',
  'nigeria', 'kenya', 'ghana', 'south africa', 'sudan', 'ethiopia', 'tanzania', 'uganda',
  'morocco', 'tunisia', 'algeria', 'libya', 'azerbaijan', 'kazakhstan', 'uzbekistan',
]

/**
 * Whole-term match. Substring matching is not safe here — "Oman" sits inside
 * "Romania" and "Ottoman", and either would invent Gulf experience out of
 * nothing, so a term must be bounded by non-letters on both sides.
 *
 * Within a term, ANY run of non-letters separates: the term is split into its
 * letter groups and rejoined with `[^a-z]+`. That is what makes "U.A.E.",
 * "U A E" and "(U-A-E)" read as one phrase, and "Abu Dhabi", "Abu-Dhabi" and
 * "Abu, Dhabi" likewise. Resume location lines punctuate however they like,
 * and the punctuation carries no meaning here.
 */
function containsTerm(haystack: string, term: string): boolean {
  const parts = term.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  if (parts.length === 0) return false
  return new RegExp(`(^|[^a-z])${parts.join('[^a-z]+')}([^a-z]|$)`, 'i').test(haystack)
}

function matchAny(haystack: string, terms: string[]): boolean {
  return terms.some((t) => containsTerm(haystack, t))
}

export interface GccLocationMatch {
  country: TargetCountry
  /** The exact phrase in the resume that produced this, for honest evidence text. */
  matchedOn: string
}

/**
 * Resolve a free-text work location to a GCC country, or null.
 *
 * Order is deliberate. An explicitly named GCC country beats a city, because
 * it is the more direct statement of the same fact. A non-GCC country with no
 * GCC country beside it vetoes everything below it. Only then are cities read,
 * and only then a vague "Gulf".
 */
export function gccCountryFromLocation(raw: string | null | undefined): GccLocationMatch | null {
  const text = raw?.trim().toLowerCase()
  if (!text) return null

  for (const [country, terms] of COUNTRY_TERMS) {
    const hit = terms.find((t) => containsTerm(text, t))
    if (hit) return { country, matchedOn: hit }
  }

  // No GCC country named. A named non-GCC country now outranks any city.
  if (matchAny(text, NON_GCC_COUNTRY_TERMS)) return null

  for (const [country, terms] of CITY_TERMS) {
    const hit = terms.find((t) => containsTerm(text, t))
    if (hit) return { country, matchedOn: hit }
  }

  const generic = GENERIC_GULF_TERMS.find((t) => containsTerm(text, t))
  if (generic) return { country: 'generic_gulf', matchedOn: generic }

  return null
}
