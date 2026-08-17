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
  currently_in_gulf: 15,
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
  currently_in_gulf: {
    gulf_market_position: 15,
    work_experience: 28,
    skills: 14,
    education: 4,
    certifications: 9,
    resume_quality: 30,
  },
  returner: {
    gulf_market_position: 8,
    work_experience: 30,
    skills: 15,
    education: 8,
    certifications: 10,
    resume_quality: 29,
  },
  experienced: {
    gulf_market_position: 5,
    work_experience: 30,
    skills: 20,
    education: 10,
    certifications: 10,
    resume_quality: 25,
  },
  fresher: {
    gulf_market_position: 0,
    work_experience: 22, // scored on projects/internships, not employment
    skills: 22,
    education: 28,
    certifications: 13,
    resume_quality: 15,
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
