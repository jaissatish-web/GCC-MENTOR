import type { DimensionKey, Scenario, ScoreBand } from '@/lib/gulfReadiness/types'

/**
 * The tunable knobs — weights, situation points, band cut-offs and every message.
 *
 * DELIBERATELY IN ONE FILE. ChatGPT's spec and plain sense agree: these are the
 * numbers and words we will change once real scores come in, so they live apart
 * from the engine that reads them. Later this can move behind an admin screen, the
 * way prompts did. Nothing here decides logic; it only parameterises it.
 */

export const SCENARIO_LABELS: Record<Scenario, string> = {
  currently_in_gulf: 'In the Gulf Market',
  returner: 'Gulf Returner',
  experienced: 'Experienced Professional',
  fresher: 'Early Career',
}

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  gulf_market_position: 'Gulf Market Position',
  work_experience: 'Work Experience',
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
  gulf_essentials: 'Gulf CV Essentials',
  resume_quality: 'Resume Quality & Targeting',
}

/**
 * The situation dimension's max, per scenario — the visible expression of the
 * founder's "+3/+3 makes a difference".
 *
 * Its max varies by scenario, and the engine fills it exactly to its max, so a
 * stronger situation is worth more AND every scenario can still reach 100 (the
 * remaining points come from the resume). A fresher's situation max is 0 and the
 * dimension is hidden for them — they are scored on education, projects and skills,
 * never punished for a situation they cannot change.
 */
export const SITUATION_POINTS: Record<Scenario, number> = {
  currently_in_gulf: 12,
  returner: 8,
  experienced: 5,
  fresher: 0,
}

/**
 * Weights per scenario. Every column sums to 100, asserted at module load below.
 *
 * `gulf_market_position` equals SITUATION_POINTS for that scenario, so the two
 * cannot drift. For the fresher the work_experience slot is scored on
 * projects/internships instead of employment (the engine handles that), and the
 * freed situation points are redistributed to education and skills.
 */
export const SCENARIO_WEIGHTS: Record<Scenario, Record<DimensionKey, number>> = {
  // v2 (2026-10-01): Gulf CV Essentials is 20 everywhere — the same 20 points
  // (photo 6, notice 3, visa or passport 3, WhatsApp 2, Arabic 2, driving
  // licence 2, nationality + location 2) for every scenario, so "a professional
  // photo is worth 6" is true for everyone. Its 20 came out of resume quality
  // (which no longer double-counts visa / notice / nationality / languages) and
  // evenly from the rest.
  currently_in_gulf: {
    gulf_market_position: 12,
    work_experience: 24,
    skills: 12,
    education: 4,
    certifications: 8,
    gulf_essentials: 20,
    resume_quality: 20,
  },
  returner: {
    gulf_market_position: 8,
    work_experience: 26,
    skills: 13,
    education: 7,
    certifications: 8,
    gulf_essentials: 20,
    resume_quality: 18,
  },
  experienced: {
    gulf_market_position: 5,
    work_experience: 26,
    skills: 16,
    education: 8,
    certifications: 8,
    gulf_essentials: 20,
    resume_quality: 17,
  },
  fresher: {
    gulf_market_position: 0,
    work_experience: 18, // scored on projects/internships, not employment
    skills: 18,
    education: 22,
    certifications: 10,
    gulf_essentials: 20,
    resume_quality: 12,
  },
}

// Fail loudly at load if any scenario's weights do not sum to 100, or if the
// situation weight and SITUATION_POINTS disagree. A silent drift here produces a
// score that looks fine and means nothing — the same discipline lib/readiness.ts
// already applies.
for (const scenario of Object.keys(SCENARIO_WEIGHTS) as Scenario[]) {
  const w = SCENARIO_WEIGHTS[scenario]
  const sum = Object.values(w).reduce((a, b) => a + b, 0)
  if (sum !== 100) {
    throw new Error(`Gulf readiness weights for '${scenario}' sum to ${sum}, expected 100`)
  }
  if (w.gulf_market_position !== SITUATION_POINTS[scenario]) {
    throw new Error(
      `Gulf readiness: situation weight (${w.gulf_market_position}) and points ` +
        `(${SITUATION_POINTS[scenario]}) disagree for '${scenario}'`,
    )
  }
}

/** Score band cut-offs. Founder's cut points: under 50, 50–74, 75+. */
export function bandKeyFor(score: number): ScoreBand['key'] {
  if (score >= 75) return 'ready'
  if (score >= 50) return 'mid'
  return 'under_50'
}

/**
 * 3 bands × 4 scenarios = 12 messages. Scenario-aware, not only score-aware.
 *
 * Every message routes honestly to optimization — because at every band there is a
 * REAL reason to optimise, never an invented one. And none of them claims a hiring
 * outcome: readiness to APPLY, never a probability of getting hired.
 */
export const BAND_MESSAGES: Record<Scenario, Record<ScoreBand['key'], { label: string; message: string }>> = {
  currently_in_gulf: {
    under_50: {
      label: 'In-Market, But Under-Prepared',
      message:
        "Being in the Gulf is a real advantage, but your resume is not yet showing it. Start by optimising your resume so it presents your Gulf experience and availability clearly.",
    },
    mid: {
      label: 'Marketable, With Gaps',
      message:
        "You are in the market and reasonably positioned. The fastest gain now is an optimised resume that leads with your Gulf-relevant work and quantifies your achievements.",
    },
    ready: {
      label: 'Gulf-Ready',
      message:
        "You are well positioned to apply. To actually get shortlisted, tailor an optimised resume to each specific job description rather than sending the same CV everywhere.",
    },
  },
  returner: {
    under_50: {
      label: 'Re-entry Needs Work',
      message:
        "Your Gulf experience is a genuine asset, but your resume is not positioning you for re-entry. Start by optimising it around your GCC experience and current availability.",
    },
    mid: {
      label: 'Re-entry In Progress',
      message:
        "You have proven Gulf experience and a decent profile. An optimised resume that foregrounds that experience and your readiness to return is the next step.",
    },
    ready: {
      label: 'Ready to Return',
      message:
        "You are strongly positioned to return to the Gulf. Tailor an optimised resume to each specific role to make your re-entry case clear to that employer.",
    },
  },
  experienced: {
    under_50: {
      label: 'Building Toward the Gulf',
      message:
        "You have professional experience but your resume is not yet framed for Gulf employers. Optimising it to show transferable, GCC-relevant strengths is where to start.",
    },
    mid: {
      label: 'Transferable, With Work to Do',
      message:
        "Your experience can transfer to the Gulf market; the challenge is showing employers why. An optimised, GCC-positioned resume is the most useful next move.",
    },
    ready: {
      label: 'Strong Transfer Profile',
      message:
        "Your profile transfers well to the Gulf market. Tailor an optimised resume to each target job to make the relevance obvious for that specific role.",
    },
  },
  fresher: {
    under_50: {
      label: 'Early Start',
      message:
        "You do not need Gulf experience to begin building Gulf readiness. Start by optimising your resume to present your education, projects and skills for the GCC market.",
    },
    mid: {
      label: 'Promising Start',
      message:
        "Your foundation is coming together. An optimised resume that leads with your education, projects and skills — not your lack of experience — is the next step.",
    },
    ready: {
      label: 'Strong Foundation',
      message:
        "You have a strong early-career profile. Tailor an optimised resume to each specific role so employers see your fit for that job, not just your potential.",
    },
  },
}

// ---------------------------------------------------------------------------
// Gulf Readiness v2 (2026-10-01) — essentials, must-haves, verdict
// ---------------------------------------------------------------------------

/**
 * The 20 points of Gulf CV Essentials. Sums to SCENARIO_WEIGHTS[*].gulf_essentials
 * (asserted below), so each item's number here IS its number in the score.
 *
 * Market basis (checked 2026-10-01): a professional headshot is customary on a
 * Gulf CV and leaving it out reads as unfamiliarity with the market; recruiters
 * screen on availability (notice), visa / passport status and contact by
 * WhatsApp; Arabic and a Gulf driving licence are a plus for many roles.
 */
export const ESSENTIAL_POINTS = {
  photo: 6,
  notice: 3,
  visa_or_passport: 3,
  whatsapp: 2,
  arabic: 2,
  driving_licence: 2,
  nationality_location: 2,
} as const

/** Photo points by state. `unknown` is left out of the score entirely. */
export const PHOTO_POINTS: Record<'none' | 'hidden' | 'shown' | 'shown_confirmed', number> = {
  none: 0,
  hidden: 2,
  shown: 4,
  shown_confirmed: 6,
}

/** The professional-photo checklist the user confirms (we never judge a photo by code). */
export const PHOTO_CHECKLIST: readonly string[] = [
  'Plain, light background',
  'Formal or business clothes',
  'Head and shoulders, facing the camera',
  'Taken in the last two years',
]

for (const scenario of Object.keys(SCENARIO_WEIGHTS) as Scenario[]) {
  const total = Object.values(ESSENTIAL_POINTS).reduce((a, b) => a + b, 0)
  if (SCENARIO_WEIGHTS[scenario].gulf_essentials !== total) {
    throw new Error(`Gulf readiness: gulf_essentials weight for '${scenario}' must equal the essentials points (${total})`)
  }
}

/** Passport must be valid at least this long for a work visa (most GCC visas: six months). */
export const PASSPORT_MIN_DAYS = 183

/** Verdict wording. The counts are filled in by the engine. */
export const VERDICT_COPY = {
  ready: {
    label: 'Ready to apply',
    message: 'Your profile and paperwork are in place for Gulf applications. Tailor your CV to each job to get shortlisted.',
  },
  almost: {
    label: 'Almost ready',
    message: 'You are close. Finish the steps below — the paperwork first — and you are ready to apply.',
  },
  not_ready: {
    label: 'Not ready yet',
    message: 'A few things stand between you and a Gulf job offer. Start with the first step below.',
  },
} as const

/**
 * Health regulators by target country — the licence a nurse, doctor, pharmacist
 * or allied-health professional needs before they can be hired.
 */
export const HEALTH_REGULATORS: Record<string, string> = {
  uae: 'DHA (Dubai), DOH (Abu Dhabi) or MOHAP (other emirates)',
  saudi_arabia: 'SCFHS (Saudi Commission for Health Specialties)',
  qatar: 'the Department of Healthcare Professions (QCHP)',
  oman: 'OMSB / the Ministry of Health',
  kuwait: 'the Ministry of Health',
  bahrain: 'NHRA (National Health Regulatory Authority)',
}

export const PAPERWORK_COPY = {
  passport: {
    label: 'Passport valid for 6+ months',
    whyMissing: 'Your passport expires within six months (or has expired). Gulf work visas need at least six months of validity, and many employers want two years.',
    whyUnknown: 'Add your passport expiry date so we can check it — Gulf work visas need at least six months of validity.',
    steps: [
      'Renew your passport now — renewal can take several weeks.',
      'Then update the expiry date in your Career Profile.',
    ],
    ecrStep: 'Your passport is ECR: for most Gulf jobs your employer applies for emigration clearance on the eMigrate portal before you travel. Make sure the job is from a registered recruiter or employer.',
  },
  degree_attestation: {
    label: 'Degree attested',
    why: 'Skilled work permits (UAE skill levels 1–3, and most professional roles in the region) need your degree attested before the visa is issued.',
    steps: [
      'Home-country authentication of the certificate (state education department / notary).',
      'Your foreign ministry\'s attestation or apostille.',
      'Attestation by the embassy of the Gulf country you are going to.',
      'Final attestation by that country\'s foreign ministry after you arrive (your employer usually guides this).',
      'Allow 2–6 weeks; start as soon as you begin applying.',
    ],
  },
  saudi_verification: {
    label: 'Saudi professional verification',
    why: 'Saudi Arabia now requires professional verification for most work visas: QVP checks your qualification, and SVP is a skills test for technical trades. Residency renewals depend on it too.',
    steps: [
      'Have your attested degree and experience letters ready.',
      'Professionals: your qualification is verified through QVP during the visa process — your employer starts it.',
      'Technical trades: book and pass the SVP skills test (a short theory test plus a practical) at an approved centre.',
      'The certificate is valid for five years — keep a copy for your employer.',
    ],
  },
  professional_licence_health: {
    label: 'Healthcare licence',
    steps: (regulator: string) => [
      'Get your documents primary-source verified (DataFlow).',
      `Pass the licensing exam for ${regulator} (usually through Prometric).`,
      'Register for your licence or eligibility letter — employers often hire only licensed or eligible candidates.',
    ],
  },
  professional_licence_engineer: {
    label: 'Saudi Council of Engineers registration',
    why: 'Engineers must be registered with the Saudi Council of Engineers (SCE) to work as engineers in Saudi Arabia.',
    steps: [
      'Collect your attested degree and experience letters.',
      'Apply for SCE membership and the professional assessment (your employer usually starts it).',
    ],
  },
} as const
