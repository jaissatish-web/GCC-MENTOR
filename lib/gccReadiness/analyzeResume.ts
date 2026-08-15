import type { AtsScoreResult } from '@/lib/ai/atsScorePrompt'

/**
 * Deterministic GCC readiness analysis — no model call.
 *
 * WHY THIS EXISTS
 * The free scan used to be two sequential LLM calls and took 44–97 seconds,
 * most of it spent asking a model to re-type the resume as JSON. Almost none
 * of what the readiness report actually says needs a model:
 *
 *   "Does this resume state visa status?"      -> a lookup, not a judgement
 *   "Are achievements quantified?"             -> count digits in bullets
 *   "Is there an education section?"           -> match a heading
 *   "Does it name Gulf clients/standards?"     -> match a known list
 *
 * Three things this buys beyond speed, and the second one matters most:
 *
 *  1. It runs in milliseconds and costs nothing, on traffic that is free.
 *  2. It is REPEATABLE. An LLM gives a different score to the same resume on
 *     each run — the two scans of the founder's own resume in testing came back
 *     78 and 45. A "readiness score" that moves when nothing changed is not a
 *     score, and it is the fastest way to lose a user's trust in the number.
 *  3. It cannot invent. Every point awarded or withheld traces to a specific
 *     rule against specific text, which is the product's core promise enforced
 *     structurally rather than by asking a model nicely.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * It does not judge whether experience is genuinely relevant, and it does not
 * rewrite anything. Those need a model and belong in the paid optimizer, where
 * the user has chosen to wait. This module answers "is your CV ready for the
 * Gulf market", which is a checklist question.
 */

export interface ReadinessSignal {
  /** Stable id, so the UI can link a finding to the field that fixes it. */
  id: string
  label: string
  present: boolean
  /** Points this signal contributes to its category when present. */
  weight: number
  /** Shown when absent — phrased as the action to take. */
  fix: string
  /** Shown when present — phrased as what the resume already does well. */
  credit: string
}

export interface ResumeAnalysis extends AtsScoreResult {
  /** Every check, pass or fail — lets the UI explain the score line by line. */
  signals: {
    structure: ReadinessSignal[]
    clarity: ReadinessSignal[]
    gulf: ReadinessSignal[]
  }
  /** Facts pulled out deterministically. Never guessed. */
  detected: {
    email: string | null
    phone: string | null
    linkedin: string | null
    yearsMentioned: number | null
    gulfCountries: string[]
    gulfClients: string[]
    languages: string[]
    /** undefined = the source gave us no way to check (pasted text / DOCX). */
    hasImage: boolean | undefined
  }
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const GULF_COUNTRY_TERMS: Array<[string, RegExp]> = [
  ['Saudi Arabia', /\b(saudi|ksa|riyadh|jeddah|dammam|jubail|yanbu|neom|tabuk)\b/i],
  ['UAE', /\b(uae|united arab emirates|dubai|abu dhabi|sharjah|ruwais)\b/i],
  ['Qatar', /\b(qatar|doha|ras laffan)\b/i],
  ['Oman', /\b(oman|muscat|sohar|duqm)\b/i],
  ['Kuwait', /\b(kuwait)\b/i],
  ['Bahrain', /\b(bahrain|manama)\b/i],
]

/** Operators and standards whose names carry real weight with Gulf recruiters. */
const GULF_CLIENT_TERMS: Array<[string, RegExp]> = [
  ['Saudi Aramco', /\baramco\b/i],
  ['ADNOC', /\badnoc\b/i],
  ['QatarEnergy', /\bqatar\s?energy|qatargas|rasgas\b/i],
  ['SABIC', /\bsabic\b/i],
  ['KNPC', /\bknpc\b/i],
  ['PDO', /\b(petroleum development oman|pdo)\b/i],
  ['Bechtel', /\bbechtel\b/i],
  ['Shell DEP', /\bshell\b/i],
  ['TotalEnergies', /\btotal\s?energies\b/i],
  ['Petrofac', /\bpetrofac\b/i],
  ['Saipem', /\bsaipem\b/i],
  ['Fluor', /\bfluor\b/i],
  ['Worley', /\bworley\b/i],
  ['McDermott', /\bmcdermott\b/i],
]

/** Languages that materially affect Gulf hiring. */
const LANGUAGE_TERMS: Array<[string, RegExp]> = [
  ['English', /\benglish\b/i],
  ['Arabic', /\barabic\b/i],
  ['Hindi', /\bhindi\b/i],
  ['Urdu', /\burdu\b/i],
  ['Malayalam', /\bmalayalam\b/i],
  ['Tamil', /\btamil\b/i],
  ['Tagalog', /\b(tagalog|filipino)\b/i],
]

const ACTION_VERBS =
  /\b(led|managed|delivered|executed|commissioned|supervised|directed|implemented|designed|developed|coordinated|improved|reduced|increased|achieved|completed|installed|maintained|tested|validated|optimi[sz]ed|built|launched|negotiated|trained|mentored)\b/i

const WEAK_OPENERS =
  /\b(responsible for|duties included|worked on|involved in|helped with|assisted in|tasked with)\b/i

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function has(text: string, re: RegExp): boolean {
  return re.test(text)
}

/** Split into probable bullet/line units for per-line checks. */
function toLines(text: string): string[] {
  return text
    .split(/[\n\r]+|(?=[▹•·◦‣●])|(?<=\.)\s{2,}/)
    .map((l) => l.replace(/^[\s▹•·◦‣●\-–—*]+/, '').trim())
    .filter((l) => l.length > 0)
}

function signal(
  id: string,
  label: string,
  present: boolean,
  weight: number,
  fix: string,
  credit: string
): ReadinessSignal {
  return { id, label, present, weight, fix, credit }
}

function scoreOf(signals: ReadinessSignal[]): number {
  const total = signals.reduce((n, s) => n + s.weight, 0)
  if (total === 0) return 0
  const earned = signals.reduce((n, s) => n + (s.present ? s.weight : 0), 0)
  return Math.round((earned / total) * 100)
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export interface AnalyzeOptions {
  /**
   * Raster images found in the source PDF, if it was a PDF.
   *
   * A weak hint only: a CV may embed a company logo or an icon rather than a
   * headshot, so a non-zero count is treated as "an image is present" and the
   * copy is hedged accordingly. `undefined` (pasted text, or a DOCX) means we
   * genuinely do not know, and the check is skipped rather than failed — a
   * user who pasted their text must never be told their photo is missing when
   * we had no way to look.
   */
  imageCount?: number
}

export function analyzeResume(resumeText: string, options: AnalyzeOptions = {}): ResumeAnalysis {
  const text = resumeText ?? ''
  const lines = toLines(text)

  // ---- Deterministic fact extraction (regex, never a model) ---------------
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null
  const phone =
    text.match(/(?:\+\d{1,4}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,4}\d{2,4}/)?.[0]?.trim() ?? null
  const linkedin = text.match(/linkedin\.com\/[A-Za-z0-9/_-]+/i)?.[0] ?? null
  const yearsMentioned = (() => {
    const m = text.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i)
    return m ? Number(m[1]) : null
  })()
  const languages = LANGUAGE_TERMS.filter(([, re]) => re.test(text)).map(([n]) => n)
  const gulfCountries = GULF_COUNTRY_TERMS.filter(([, re]) => re.test(text)).map(([n]) => n)
  const gulfClients = GULF_CLIENT_TERMS.filter(([, re]) => re.test(text)).map(([n]) => n)

  // ---- Structure ----------------------------------------------------------
  const structure: ReadinessSignal[] = [
    signal('email', 'Email address', Boolean(email), 12,
      'Add a professional email address near the top of your CV.',
      'Contact email is present.'),
    signal('phone', 'Phone number', Boolean(phone), 12,
      'Add a phone number with your country code, e.g. +966 or +91.',
      'Phone number is present.'),
    signal('location', 'Current location', has(text, /\b(location|based\s+in|address|city)\b/i) || gulfCountries.length > 0, 8,
      'State where you are currently based — Gulf recruiters filter on it.',
      'Your current location is clear.'),
    signal('summary_section', 'Professional summary', has(text, /\b(professional\s+summary|career\s+summary|profile\s+summary|^summary)\b/im), 14,
      'Add a 2–3 sentence professional summary at the top — it is the first thing a recruiter reads.',
      'Has a professional summary section.'),
    signal('experience_section', 'Work experience section', has(text, /\b(work\s+experience|professional\s+experience|employment\s+history|career\s+history)\b/i), 16,
      'Add a clearly headed work experience section.',
      'Work experience is clearly sectioned.'),
    signal('education_section', 'Education section', has(text, /\b(education\w*|academic\w*|qualification\w*)/i), 12,
      'Add an education section with your degree and institution.',
      'Education is listed.'),
    signal('skills_section', 'Skills section', has(text, /\b(skills?|competenc\w*|technical\s+(expertise|skills))/i), 10,
      'Add a skills section listing the systems and tools you have worked with.',
      'Skills are listed.'),
    signal('certifications', 'Certifications', has(text, /\b(certificat\w*|certified|licen[sc]e\w*|accredit\w*)/i), 8,
      'List your certifications with the issuing body — these carry real weight in Gulf hiring.',
      'Certifications are included.'),
    signal('linkedin', 'LinkedIn profile', Boolean(linkedin), 6,
      'Add your LinkedIn URL — Gulf recruiters routinely check it before calling.',
      'LinkedIn profile is linked.'),
    signal('dates', 'Dates on roles', has(text, /\b(19|20)\d{2}\b/) && (text.match(/\b(19|20)\d{2}\b/g) ?? []).length >= 2, 8,
      'Add start and end dates to each role — ATS software uses them to compute your experience.',
      'Roles carry dates.'),
  ]

  // ---- Clarity & impact ---------------------------------------------------
  const bulletish = lines.filter((l) => l.length > 25 && l.length < 400)
  const quantified = bulletish.filter((l) => /\d/.test(l)).length
  const quantRatio = bulletish.length > 0 ? quantified / bulletish.length : 0
  const actionLed = bulletish.filter((l) => ACTION_VERBS.test(l.slice(0, 40))).length
  const actionRatio = bulletish.length > 0 ? actionLed / bulletish.length : 0
  const weakCount = bulletish.filter((l) => WEAK_OPENERS.test(l)).length
  const wordCount = text.split(/\s+/).filter(Boolean).length

  const clarity: ReadinessSignal[] = [
    signal('quantified', 'Quantified achievements', quantRatio >= 0.25, 30,
      'Add numbers to your achievements — team sizes, budgets, volumes, percentages. Recruiters scan for them.',
      'Achievements are backed by concrete numbers.'),
    signal('action_verbs', 'Strong action verbs', actionRatio >= 0.3, 22,
      'Start each bullet with an action verb (Led, Delivered, Commissioned) rather than a noun phrase.',
      'Bullets lead with strong action verbs.'),
    signal('no_weak_openers', 'Avoids weak phrasing', weakCount <= Math.max(1, bulletish.length * 0.15), 18,
      'Replace "Responsible for" and "Duties included" with what you actually achieved.',
      'Avoids vague "responsible for" phrasing.'),
    signal('bullets', 'Uses bullet points', bulletish.length >= 6, 15,
      'Break long paragraphs into bullet points — dense text does not survive a six-second scan.',
      'Experience is written as scannable bullets.'),
    signal('length', 'Appropriate length', wordCount >= 250 && wordCount <= 1600, 15,
      wordCount < 250
        ? 'Your CV looks short — expand your recent roles with responsibilities and achievements.'
        : 'Your CV looks long — tighten older roles so the recent, relevant ones stand out.',
      'Length is in the range Gulf recruiters expect.'),
  ]

  // ---- Gulf readiness -----------------------------------------------------
  const gulf: ReadinessSignal[] = [
    signal('nationality', 'Nationality stated', has(text, /\bnational(ity|s)?\b|\bcitizen(ship)?\b/i), 16,
      'State your nationality — Gulf employers need it for visa processing and expect it on the CV.',
      'Nationality is stated.'),
    signal('passport', 'Passport details', has(text, /\bpassport\b/i), 12,
      'Add your passport status and validity — it signals you are ready for visa processing.',
      'Passport details are included.'),
    signal('visa', 'Visa / Iqama status', has(text, /\b(visa\w*|iqama\w*|residence\s+permit|work\s+permit|transferab\w*)/i), 18,
      'State your visa or Iqama status and whether it is transferable — this is often the first filter.',
      'Visa / Iqama status is clear.'),
    signal('availability', 'Availability / notice period', has(text, /\b(notice\s+period|availab\w*|immediate\w*|relocat\w*)/i), 14,
      'State your availability or notice period, and that you are willing to relocate.',
      'Availability and relocation readiness are stated.'),
    signal('gulf_experience', 'Gulf region experience', gulfCountries.length > 0, 20,
      'If you have Gulf experience, name the countries and sites explicitly. If not, highlight transferable international project work.',
      `Gulf experience is visible (${gulfCountries.join(', ')}).`),
    signal('gulf_clients', 'Recognised clients / standards', gulfClients.length > 0, 12,
      'Name the operators and standards you have worked to (Aramco, ADNOC, Shell DEP) — recruiters search for them.',
      `Names recognised Gulf clients/standards (${gulfClients.slice(0, 4).join(', ')}).`),
    signal('notice_period', 'Notice period', has(text, /\b(notice\s+period|serving\s+notice|immediate(ly)?\s+(available|join\w*)|available\s+immediately|availability\s*:?\s*immediate|\d+\s*(days?|weeks?|months?)\s+notice)\b/i), 12,
      'State your notice period explicitly (e.g. "Notice period: 30 days"). Gulf employers shortlist on start date.',
      'Notice period is stated.'),
    signal('languages', 'Languages', languages.length > 0, 10,
      'List the languages you speak and your level — English is expected, and Arabic is a genuine advantage.',
      `Languages are listed (${languages.slice(0, 3).join(', ')}).`),
    signal('date_of_birth', 'Date of birth / age', has(text, /\b(date\s+of\s+birth|d\.?o\.?b\.?|born|age)\b/i), 8,
      'Add your date of birth — unlike Western CVs, Gulf employers expect it for visa eligibility.',
      'Date of birth is included.'),
    signal('marital_status', 'Marital status', has(text, /\b(marital\s+status|maritalstatus|married|bachelor\s+status)\b|\bstatus\s*:\s*(single|married)\b/i), 6,
      'Add marital status — commonly requested on Gulf CVs for family-status visa purposes.',
      'Marital status is included.'),
    signal('license', 'Driving licence', has(text, /\bdriv(ing|er'?s)\s+licen[sc]e\w*/i), 8,
      'Add your driving licence if you hold one — many Gulf site roles require it.',
      'Driving licence is mentioned.'),
  ]

  // A photo is expected on Gulf CVs far more than Western ones, but we can only
  // check it for PDFs. When the user pasted text or sent a DOCX we cannot look,
  // so the check is OMITTED rather than failed — telling someone their photo is
  // missing when we never had a way to see it is exactly the kind of confident
  // wrong advice this engine exists to avoid.
  if (typeof options.imageCount === 'number') {
    gulf.push(
      signal('photo', 'Photo', options.imageCount > 0, 10,
        'Consider adding a professional headshot — most Gulf employers expect a photo on the CV.',
        'Your CV includes an image, which most Gulf employers expect.')
    )
  }

  // ---- Scores -------------------------------------------------------------
  const structureScore = scoreOf(structure)
  const clarityScore = scoreOf(clarity)
  const gulfScore = scoreOf(gulf)

  // Gulf readiness is the product's whole point, so it carries the most weight.
  const overall = Math.round(structureScore * 0.3 + clarityScore * 0.25 + gulfScore * 0.45)

  const all = [...structure, ...clarity, ...gulf]
  const strengths = all
    .filter((s) => s.present)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((s) => s.credit)

  const improvements = all
    .filter((s) => !s.present)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map((s) => s.fix)

  const gulfNotes = gulf
    .filter((s) => !s.present)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((s) => s.fix)

  return {
    overall_score: overall,
    category_scores: {
      structure: structureScore,
      clarity_and_impact: clarityScore,
      gulf_readiness: gulfScore,
    },
    strengths: strengths.length > 0 ? strengths : ['We could read your CV and its basic structure.'],
    improvements:
      improvements.length > 0
        ? improvements
        : ['Your CV covers the essentials — tailor it to each specific role next.'],
    gulf_format_notes:
      gulfNotes.length > 0
        ? gulfNotes
        : ['Your CV already carries the Gulf-specific details recruiters look for.'],
    summary: buildSummary(overall, gulfScore, gulf, gulfCountries),
    job_match: null,
    signals: { structure, clarity, gulf },
    detected: {
      email,
      phone,
      linkedin,
      yearsMentioned,
      gulfCountries,
      gulfClients,
      languages,
      hasImage: typeof options.imageCount === 'number' ? options.imageCount > 0 : undefined,
    },
  }
}

/**
 * A written verdict assembled from the same signals that produced the score.
 *
 * Template-composed rather than model-written: it must never state anything the
 * checks did not establish, and it has to say the same thing every time for the
 * same CV.
 */
function buildSummary(
  overall: number,
  gulfScore: number,
  gulfSignals: ReadinessSignal[],
  countries: string[]
): string {
  const band =
    overall >= 80
      ? 'Your CV is in good shape for Gulf applications'
      : overall >= 60
        ? 'Your CV is a reasonable starting point for Gulf applications'
        : overall >= 40
          ? 'Your CV needs work before it will compete for Gulf roles'
          : 'Your CV is not yet ready for Gulf applications'

  const missing = gulfSignals.filter((s) => !s.present).sort((a, b) => b.weight - a.weight)
  const gulfPart =
    gulfScore >= 75
      ? countries.length > 0
        ? ` Your Gulf-specific details are strong, and your ${countries.join(' / ')} experience is clearly visible.`
        : ' Your Gulf-specific details are strong.'
      : missing.length > 0
        ? ` The biggest gap is Gulf-specific: ${missing
            .slice(0, 2)
            .map((s) => s.label.toLowerCase())
            .join(' and ')}.`
        : ''

  return `${band} — scoring ${overall} out of 100.${gulfPart} Everything above is checked directly against the text of your CV, so nothing here is guessed.`
}
