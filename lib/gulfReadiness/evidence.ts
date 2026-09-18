import type { Confidence } from '@/lib/gulfReadiness/types'

/**
 * Reading the resume with rules, not a model.
 *
 * Each detector returns a fill ratio (0..1), the evidence it actually found, the
 * gaps it noticed, and how confident it is. The engine multiplies the ratio by the
 * dimension's weight to get points.
 *
 * THE HONESTY RULE FOR THIS FILE. A detector may only report what the text
 * supports. When it cannot read a section it returns LOW confidence and says so in
 * a gap — it never returns a confident zero, because "we could not read your
 * certifications" and "you have no certifications" are different statements and only
 * the resume knows which is true. A crude-but-honest signal is the correct trade for
 * a free, no-LLM score; the user sees their own resume and can judge.
 *
 * QUALITY, NOT PRESENCE (rebuilt 2026-09-18). The first detectors were presence
 * checks: the word "skills" plus twelve commas anywhere, the bare word
 * "engineering" as a degree, the substring "certif" as a certification. Measured
 * that day: any tidy CV scored ~100 with no recommendations, a UK retail CV that
 * ticked "in the Gulf" scored 81 "Gulf-Ready", twelve lines of keywords scored 99,
 * and deleting every Gulf term from a real CV changed nothing. Each detector now
 * reads its own SECTION and grades what is in it, and Gulf signals are read from
 * the text (detectGulfSignals) instead of being taken on the checkbox alone.
 * scripts/verify-gulf-readiness.ts pins those measured cases.
 */

export interface DetectorOutput {
  ratio: number
  evidence: string[]
  gaps: string[]
  confidence: Confidence
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Normalised lower-case text, collapsed whitespace. */
export function normalise(text: string): string {
  return (text ?? '').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').toLowerCase()
}

/** A resume this short cannot be read with any confidence at all. */
export function isLowSignal(text: string): boolean {
  return (text ?? '').trim().length < 200
}

export function wordCount(text: string): number {
  return ((text ?? '').match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length
}

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re)
  return m ? m.length : 0
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const HEADING_WORDS =
  /^(professional |career |executive |personal |technical |key |core |additional |work |employment |academic |relevant )?(summary|profile|objective|about me|about|experience|history|employment|career snapshot|career|education|qualifications?|skills|competencies|expertise|certifications?|certificates|licen[cs]es?|licen[cs]es and certifications|training|courses|projects|achievements|accomplishments|awards|languages|information|details|references|internships?|strengths)( & [a-z ]+)?:?$/i

/** A heading is a short line that names a section, or a short all-caps line. */
function isHeading(line: string): boolean {
  const t = line.trim().replace(/[:•\-–—|]+$/, '').trim()
  if (!t || t.length > 48) return false
  if (HEADING_WORDS.test(t)) return true
  const words = t.split(/\s+/)
  return words.length <= 5 && /[A-Z]/.test(t) && t === t.toUpperCase() && /^[A-Z&/ ,()-]+$/.test(t)
}

/**
 * The lines under the first heading matching `re`, up to the next heading. A
 * heading with content after a colon ("SKILLS: DCS, PLC") contributes that tail.
 */
export function sectionLines(raw: string, re: RegExp): string[] {
  const lines = (raw ?? '').replace(/\r/g, '\n').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const colon = line.indexOf(':')
    const head = colon > 0 && colon < 40 ? line.slice(0, colon) : line
    if (!re.test(head.trim()) || !(isHeading(head) || colon > 0)) continue
    const out: string[] = []
    if (colon > 0 && line.slice(colon + 1).trim()) out.push(line.slice(colon + 1).trim())
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j].trim()
      if (!l) continue
      if (isHeading(l)) break
      out.push(l)
    }
    if (out.length > 0) return out
  }
  return []
}

function splitItems(lines: string[]): string[] {
  return lines
    .flatMap((l) => l.split(/[,;•·|]|\s{2,}|\s\/\s/))
    .map((s) => s.replace(/^[\s\-–—*▪◦✓]+/, '').trim())
    .filter((s) => s.length >= 2 && s.length <= 70)
}

// ---------------------------------------------------------------------------
// Gulf signals — read from the text, never from the checkbox
// ---------------------------------------------------------------------------

const GCC_PLACES =
  /\b(saudi arabia|saudi|ksa|riyadh|jeddah|dammam|jubail|al khobar|khobar|dhahran|yanbu|tabuk|duba|neom|rabigh|ras tanura|uae|united arab emirates|dubai|abu dhabi|sharjah|ajman|ras al khaimah|fujairah|al ain|ruwais|jebel ali|qatar|doha|ras laffan|mesaieed|oman|muscat|sohar|salalah|duqm|kuwait|ahmadi|bahrain|manama|sitra)\b/g
const GCC_CLIENTS =
  /\b(saudi aramco|aramco|adnoc|takreer|borouge|sabic|ma'?aden|qatarenergy|qatar petroleum|kuwait oil company|knpc|petroleum development oman|bapco|dewa|sewa|kahramaa|red sea global|roshn|qiddiya|dp world|emaar|nesma|al[- ]futtaim|saudi electricity|etihad|emirates airline|ncb|stc|du telecom|etisalat|ooredoo)\b/g
const GCC_MOBILITY =
  /\b(iqama|residence visa|residence permit|work visa|employment visa|golden visa|transferable|no objection certificate|noc|(gcc|uae|saudi|qatar|qatari|kuwait|oman|omani|bahrain) driving licen[cs]e)\b/g
const GCC_STANDARDS = /\b(saes|saep|samss|adnoc (gi|agi)|qcs 20\d\d|dubai municipality|civil defen[cs]e|scfhs|dha licen[cs]e|doh licen[cs]e|haad|qchp|nhra|omsb|prometric|dataflow)\b/g
const GCC_PHONE = /\+\s?9(66|71|74|65|68|73)\b/g

export interface GulfSignals {
  places: string[]
  clients: string[]
  mobility: string[]
  standards: string[]
  hasGccPhone: boolean
  /** How many of the five kinds were found (0–5). */
  kinds: number
  /** Something a recruiter would read as "this person has been in the Gulf". */
  corroborated: boolean
}

const uniq = (xs: string[]) => [...new Set(xs)]

export function detectGulfSignals(raw: string): GulfSignals {
  const t = normalise(raw)
  const places = uniq(t.match(GCC_PLACES) ?? [])
  const clients = uniq(t.match(GCC_CLIENTS) ?? [])
  const mobility = uniq(t.match(GCC_MOBILITY) ?? [])
  const standards = uniq(t.match(GCC_STANDARDS) ?? [])
  const hasGccPhone = GCC_PHONE.test(raw ?? '')
  GCC_PHONE.lastIndex = 0
  const kinds = [places.length, clients.length, mobility.length, standards.length, hasGccPhone ? 1 : 0].filter(Boolean).length
  return { places, clients, mobility, standards, hasGccPhone, kinds, corroborated: places.length + clients.length > 0 || hasGccPhone }
}

// ---------------------------------------------------------------------------
// Work experience
// ---------------------------------------------------------------------------

const RANGE =
  /\b(?:\d{1,2}[/.-])?((?:19|20)\d{2})(?:[/.-]\d{1,2})?\s*(?:-|–|—|to|till|until)\s*(?:\d{1,2}[/.-])?(?:[a-z]{3,9}\.?\s+)?((?:19|20)\d{2}|present|current|now|date|till date|ongoing)/gi

/**
 * Work experience — distinct roles, total span and recency, read from the date
 * ranges a CV lists per role. Parsing employers is the structured-extraction job
 * this score deliberately avoids.
 */
export function detectWorkExperience(raw: string, thisYear = new Date().getFullYear()): DetectorOutput {
  const text = normalise(raw)
  // A CV often repeats its dates (a "career snapshot" above the full history),
  // so identical ranges count once.
  const seen = new Set<string>()
  const ranges = [...text.matchAll(RANGE)]
    .map((m) => {
      const start = Number(m[1])
      const end = /^\d/.test(m[2]) ? Number(m[2]) : thisYear
      return { start, end: Math.max(start, end) }
    })
    .filter((r) => {
      const k = `${r.start}-${r.end}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  const roleWords = countMatches(text, /\b(engineer|manager|supervisor|officer|executive|analyst|technician|specialist|consultant|coordinator|lead|head|director|administrator|operator|assistant|nurse|accountant|designer|developer|driver|foreman|inspector|electrician|welder|fitter|pharmacist|teacher|chef|cashier|salesman|associate)\b/g)

  const roles = ranges.length
  const span = roles ? Math.max(...ranges.map((r) => r.end)) - Math.min(...ranges.map((r) => r.start)) : 0
  const latest = roles ? Math.max(...ranges.map((r) => r.end)) : 0
  const recent = roles > 0 && latest >= thisYear - 2

  const evidence: string[] = []
  const gaps: string[] = []

  if (roles === 0) {
    if (roleWords > 0) gaps.push('Your roles have no clear dates — put start and end dates on every job')
    else gaps.push('No clear work history could be read from the resume')
    return { ratio: roleWords > 0 ? 0.25 : 0, evidence, gaps, confidence: roleWords > 0 ? 'medium' : 'low' }
  }

  evidence.push(roles >= 3 ? `${roles} dated roles across about ${span} years` : roles === 2 ? `Two dated roles across about ${span} years` : 'One dated role')
  if (roles < 2) gaps.push('Only one role is shown — list earlier jobs, projects or site assignments with dates')
  if (span < 3) gaps.push('Your dated experience covers under three years — include every relevant earlier role')
  if (!recent) gaps.push(`Your latest dated role ends in ${latest} — show what you have done since`)

  const ratio = clamp01(0.45 * (Math.min(roles, 4) / 4) + 0.4 * (Math.min(span, 8) / 8) + 0.15 * (recent ? 1 : 0))
  return { ratio, evidence, gaps, confidence: 'high' }
}

/**
 * Projects / internships — the fresher's substitute for employment.
 */
export function detectProjects(raw: string): DetectorOutput {
  const text = normalise(raw)
  const section = splitItems(sectionLines(raw, /projects?|internships?|training|academic projects/i))
  const mentions = countMatches(text, /\b(project|internship|intern|apprentice|thesis|capstone|final year)\b/g)
  const count = Math.max(Math.min(section.length, 6), Math.floor(mentions / 2))
  const evidence: string[] = []
  const gaps: string[] = []

  if (count >= 3) evidence.push('Several projects, internships or training entries')
  else if (count >= 1) evidence.push('Some project or internship experience')
  else gaps.push('No projects, internships or training were found — these are what a fresher is judged on')
  if (count >= 1 && count < 3) gaps.push('Add more projects, internships or training, each with what you built or did')

  return { ratio: clamp01(count / 3), evidence, gaps, confidence: section.length ? 'high' : count ? 'medium' : 'low' }
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export function detectSkills(raw: string): DetectorOutput {
  const items = splitItems(sectionLines(raw, /skills|competenc|expertise|technical|tools/i))
  const evidence: string[] = []
  const gaps: string[] = []

  if (items.length === 0) {
    const inline = /\b(proficient in|skilled in|experienced in|tools:|software:)\b/i.test(raw ?? '')
    gaps.push('No clearly labelled skills section was found — add one with 8–15 specific skills')
    return { ratio: inline ? 0.2 : 0, evidence, gaps, confidence: 'low' }
  }

  evidence.push(`A skills section listing ${items.length} skill${items.length === 1 ? '' : 's'}`)
  if (items.length < 8) gaps.push(`Only ${items.length} skills are listed — name 8–15 specific tools, systems and methods`)
  if (items.length > 40) gaps.push(`${items.length} skills is too many to read — keep the 15–25 most relevant and group them`)

  const fill = Math.min(items.length, 15) / 15
  const overload = items.length > 40 ? 0.1 : 0
  return { ratio: clamp01(0.35 + 0.65 * fill - overload), evidence, gaps, confidence: 'high' }
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

const DEGREE =
  /\b(bachelor|master'?s?|b\.?\s?tech|m\.?\s?tech|b\.\s?e\b|m\.\s?e\b|b\.?\s?sc|m\.?\s?sc|bs in|ba in|ms in|ma in|b\.?\s?com|m\.?\s?com|bca|mca|mba|bba|ph\.?\s?d|doctorate|diploma|associate degree|degree in|ll\.?\s?b|mbbs|bds|b\.?\s?pharm|pharm\.?\s?d|bsn|gnm|anm|iti|polytechnic|higher national)\b/
const SCHOOL = /\b(high school|secondary school|gcse|a[- ]levels?|ssc|hsc|12th|10th|matriculation|intermediate|o[- ]levels?)\b/
const INSTITUTION = /\b(university|college|institute|school of|academy|iit|nit)\b/

export function detectEducation(raw: string): DetectorOutput {
  const section = sectionLines(raw, /education|qualifications?|academic/i).join(' ').toLowerCase()
  const text = section || normalise(raw)
  const evidence: string[] = []
  const gaps: string[] = []

  if (DEGREE.test(text)) {
    const inst = INSTITUTION.test(text)
    evidence.push(inst ? 'A degree or diploma with its institution' : 'A degree or diploma')
    if (!inst) gaps.push('Name the university or institute — Gulf employers verify it')
    return { ratio: inst ? 1 : 0.85, evidence, gaps, confidence: 'high' }
  }
  if (SCHOOL.test(text)) {
    evidence.push('School-level education')
    gaps.push('Only school-level education was found — add any diploma, trade qualification or ongoing study')
    return { ratio: 0.4, evidence, gaps, confidence: 'high' }
  }
  if (section) {
    gaps.push('An education section is there, but no degree or diploma could be read from it — spell out the qualification')
    return { ratio: 0.3, evidence, gaps, confidence: 'low' }
  }
  gaps.push('No education or qualification could be read from the resume')
  return { ratio: 0, evidence, gaps, confidence: 'low' }
}

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------

/** Certifications Gulf employers ask for by name. Display label per pattern. */
const RECOGNISED: Array<[RegExp, string]> = [
  [/\bnebosh\b/, 'NEBOSH'], [/\biosh\b/, 'IOSH'], [/\bosha\b/, 'OSHA'], [/\bpmp\b/, 'PMP'], [/\bprince ?2\b/, 'PRINCE2'],
  [/\bcswip\b/, 'CSWIP'], [/\bapi ?(510|570|653|1169|580)\b/, 'API inspector'], [/\basnt\b|\bnde level\b|\bpcn\b/, 'NDT'],
  [/\bbgas\b/, 'BGAS'], [/\bopito\b|\bbosiet\b|\bhuet\b/, 'OPITO offshore'], [/\bh2s\b/, 'H2S'], [/\bfirst aid\b/, 'First aid'],
  [/\bbls\b|\bacls\b|\bpals\b/, 'BLS/ACLS'], [/\bdha\b|\bdoh\b|\bhaad\b|\bmoh\b|\bscfhs\b|\bqchp\b|\bnhra\b|\bomsb\b/, 'Gulf health licence'],
  [/\bprometric\b|\bdataflow\b/, 'Prometric/DataFlow'], [/\bacca\b|\bcpa\b|\bcma\b|\bcia\b|\bcfa\b/, 'Finance qualification'],
  [/\bcipd\b|\bshrm\b/, 'HR qualification'], [/\bsix sigma\b|\blean\b/, 'Six Sigma/Lean'],
  [/\biso ?\d{4,5}\b.*\b(lead )?(auditor|implementer)\b|\blead auditor\b/, 'ISO auditor'],
  [/\bt[uü]v\b|\bfunctional safety\b|\bcfse\b|\bcfsp\b/, 'Functional safety'], [/\bccna\b|\bccnp\b/, 'Cisco'],
  [/\baws certified\b|\bazure\b|\bcomptia\b|\bcissp\b|\bcisa\b|\bitil\b|\bscrum\b|\bpmi-/, 'IT certification'],
  [/\bleed\b|\brics\b|\bciob\b|\becitb\b|\bcscs\b|\bipaf\b|\bpasma\b/, 'Construction certification'],
  [/\brigger\b|\bscaffold(ing)? inspector\b|\bwelding inspector\b/, 'Site competency'],
  [/\b(gcc|uae|saudi|qatar|kuwait|oman|bahrain) driving licen[cs]e\b/, 'Gulf driving licence'],
]

export function detectCertifications(raw: string): DetectorOutput {
  const lines = sectionLines(raw, /certif|licen[cs]|training|courses/i)
  const items = splitItems(lines)
  const text = (lines.join(' ') || normalise(raw)).toLowerCase()
  const recognised = uniq(RECOGNISED.filter(([re]) => re.test(text)).map(([, label]) => label))
  const evidence: string[] = []
  const gaps: string[] = []

  if (recognised.length > 0) evidence.push(`Recognised certification${recognised.length > 1 ? 's' : ''}: ${recognised.slice(0, 4).join(', ')}`)
  if (recognised.length >= 2) return { ratio: 1, evidence, gaps, confidence: 'high' }
  if (recognised.length === 1) {
    gaps.push('One recognised certification — a second one Gulf employers name (safety, trade or licence) strengthens the case')
    return { ratio: 0.8, evidence, gaps, confidence: 'high' }
  }
  if (items.length > 0) {
    evidence.push(`${items.length} certificate or training entr${items.length === 1 ? 'y' : 'ies'}`)
    gaps.push('None of your certificates is one Gulf employers ask for by name (e.g. NEBOSH, IOSH, a trade or licensing certificate)')
    return { ratio: 0.5, evidence, gaps, confidence: 'medium' }
  }
  if (/\b(certificate|certified|licen[cs]ed)\b/.test(normalise(raw))) {
    gaps.push('Certifications are mentioned but not listed — give each its own line with the issuer')
    return { ratio: 0.3, evidence, gaps, confidence: 'low' }
  }
  gaps.push('No certifications were found — a relevant certification often lifts a Gulf application')
  return { ratio: 0, evidence, gaps, confidence: 'low' }
}

// ---------------------------------------------------------------------------
// Resume quality & targeting
// ---------------------------------------------------------------------------

const QUANTIFIED =
  /(\d[\d,.]*\s?%|[$₹€£]\s?\d|\b(?:aed|sar|qar|usd|inr)\s?\d|\b\d[\d,.]*\s?(?:\+\s?)?(?:k|m|bn|million|billion|crore|lakh|units|projects|people|staff|team|members|engineers|technicians|workers|loops|points|instruments|kv|mw|tph|bpd|barrels|tons?|tonnes|km|m3|sqm|patients|beds|clients|customers|vehicles|sites|stores|students|days|weeks|hours)\b)/gi

/**
 * Resume quality & targeting — quantified results, contact details, a real
 * summary, and the four facts a Gulf recruiter reads first (nationality, visa,
 * notice period, languages). This is the dimension optimization most directly
 * improves, so its gaps are worded to point there.
 */
export function detectResumeQuality(raw: string): DetectorOutput {
  const text = normalise(raw)
  const quantified = countMatches(raw ?? '', QUANTIFIED)
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)
  const hasPhone = /(\+?\d[\d\s-]{7,}\d)/.test(text)
  const summaryLines = sectionLines(raw, /summary|profile|about|objective/i)
  const summaryWords = wordCount(summaryLines.join(' '))
  const isObjective = /\b(seeking|looking for|aspiring|eager to|to obtain|to secure)\b/i.test(summaryLines.join(' '))

  const essentials: Array<[string, boolean]> = [
    ['nationality', /\bnationality\b|\b(indian|pakistani|filipino|egyptian|jordanian|british|nepali|sri lankan|bangladeshi|lebanese|syrian|sudanese|kenyan|nigerian|ghanaian|emirati|saudi) national\b/.test(text)],
    ['visa or residence status', /\b(visa|iqama|residence permit|work permit|residency)\b/.test(text)],
    ['notice period or availability', /\b(notice period|available immediately|immediate(ly)? (available|joining|joiner)|immediate availability|can join)\b/.test(text)],
    ['languages', /\blanguages?\b|\barabic\b|\b(fluent|native) in\b/.test(text)],
  ]

  const evidence: string[] = []
  const gaps: string[] = []

  if (quantified >= 6) evidence.push(`${quantified} quantified results`)
  else if (quantified >= 3) evidence.push(`${quantified} quantified results`)
  if (quantified < 6) gaps.push(quantified === 0 ? 'Achievements are not quantified — numbers are what a recruiter reads first' : `Only ${quantified} quantified result${quantified === 1 ? '' : 's'} — aim for one number in most roles (team size, volume, %, value)`)

  if (hasEmail && hasPhone) evidence.push('Complete contact details')
  else gaps.push('Contact details look incomplete — add a phone number with country code and an email')

  if (summaryWords >= 25 && !isObjective) evidence.push('A professional summary')
  else if (isObjective) gaps.push('Replace the objective ("seeking…") with a summary of what you have done')
  else gaps.push('No professional summary — a targeted summary frames the whole resume')

  const missing = essentials.filter(([, ok]) => !ok).map(([label]) => label)
  const present = essentials.length - missing.length
  if (present >= 3) evidence.push('The details Gulf recruiters check first (visa, notice period, nationality, languages)')
  if (missing.length > 0) gaps.push(`State your ${missing.join(', ')} — Gulf recruiters screen on these before anything else`)

  const summaryScore = summaryWords >= 25 && !isObjective ? 0.2 : summaryLines.length ? 0.1 : 0
  let ratio =
    0.35 * (Math.min(quantified, 6) / 6) + (hasEmail && hasPhone ? 0.15 : 0) + summaryScore + 0.3 * (present / essentials.length)

  const words = wordCount(raw ?? '')
  if (words < 120) {
    ratio *= 0.6
    gaps.push('Your CV is very short — a Gulf CV usually runs one to two full pages')
  }
  return { ratio: clamp01(ratio), evidence, gaps, confidence: 'high' }
}
