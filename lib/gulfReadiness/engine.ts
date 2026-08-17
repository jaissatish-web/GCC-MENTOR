import type {
  DimensionKey,
  DimensionResult,
  FunnelAnswers,
  GulfReadinessInput,
  GulfReadinessResult,
  Recommendation,
  Scenario,
} from '@/lib/gulfReadiness/types'
import {
  BAND_MESSAGES,
  DIMENSION_LABELS,
  SCENARIO_LABELS,
  SCENARIO_WEIGHTS,
  SITUATION_POINTS,
  bandKeyFor,
} from '@/lib/gulfReadiness/config'
import {
  detectCertifications,
  detectEducation,
  detectProjects,
  detectResumeQuality,
  detectSkills,
  detectWorkExperience,
  isLowSignal,
  normalise,
  type DetectorOutput,
} from '@/lib/gulfReadiness/evidence'

/**
 * The Gulf Readiness Scorecard engine. Pure, deterministic, no LLM, no I/O.
 *
 * calculateGulfReadiness(input) is the single entry point. Given the same funnel
 * answers and the same resume text it always returns the same result — which is why
 * the anonymous score and the post-signup detailed score are guaranteed identical.
 */

/** Funnel answers decide the scenario. Never inferred from the resume. */
export function scenarioFromAnswers(a: FunnelAnswers): Scenario {
  if (a.hasGulfExperience) {
    return a.currentlyInGulf ? 'currently_in_gulf' : 'returner'
  }
  return a.hasProfessionalExperience ? 'experienced' : 'fresher'
}

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 } as const

function pointsFrom(ratio: number, max: number): number {
  return Math.round(ratio * max)
}

export function calculateGulfReadiness(input: GulfReadinessInput): GulfReadinessResult {
  const scenario = scenarioFromAnswers(input.answers)
  const weights = SCENARIO_WEIGHTS[scenario]
  const text = normalise(input.resumeText)
  const lowResumeSignal = isLowSignal(input.resumeText)

  // --- the five resume dimensions, each a detector × its weight ---------------
  // The work_experience slot is scored on projects/internships for a fresher and
  // on employment for everyone else. Same slot, scenario-appropriate evidence.
  const detectors: Record<Exclude<DimensionKey, 'gulf_market_position'>, DetectorOutput> = {
    work_experience: scenario === 'fresher' ? detectProjects(text) : detectWorkExperience(text),
    skills: detectSkills(text),
    education: detectEducation(text),
    certifications: detectCertifications(text),
    resume_quality: detectResumeQuality(text),
  }

  const dimensions: DimensionResult[] = []

  // The situation dimension: auto-filled to its max from the funnel, shown for
  // everyone except a fresher (whose max is 0).
  if (SITUATION_POINTS[scenario] > 0) {
    dimensions.push({
      key: 'gulf_market_position',
      label: DIMENSION_LABELS.gulf_market_position,
      score: SITUATION_POINTS[scenario],
      max: SITUATION_POINTS[scenario],
      evidence: [situationEvidence(scenario)],
      gaps: [],
      confidence: 'high',
    })
  }

  for (const key of ['work_experience', 'skills', 'education', 'certifications', 'resume_quality'] as const) {
    const d = detectors[key]
    const max = weights[key]
    dimensions.push({
      key,
      label: key === 'work_experience' && scenario === 'fresher' ? 'Projects & Internships' : DIMENSION_LABELS[key],
      score: pointsFrom(d.ratio, max),
      max,
      evidence: d.evidence,
      gaps: d.gaps,
      // A resume too thin to read cannot support a high confidence anywhere.
      confidence: lowResumeSignal && d.confidence === 'high' ? 'medium' : d.confidence,
    })
  }

  const finalScore = Math.min(100, dimensions.reduce((sum, d) => sum + d.score, 0))

  // --- band + scenario-aware message -----------------------------------------
  const bandKey = bandKeyFor(finalScore)
  const bandCopy = BAND_MESSAGES[scenario][bandKey]

  // --- strengths and weaknesses, straight from the dimensions ----------------
  // A dimension at ≥70% of its max is a strength; ≤40% is a weakness. Reading from
  // the same numbers shown means the narrative can never contradict the score.
  const strengths: string[] = []
  const weaknesses: string[] = []
  for (const d of dimensions) {
    if (d.max === 0) continue
    const pct = d.score / d.max
    if (pct >= 0.7 && d.evidence[0]) strengths.push(d.evidence[0])
    else if (pct <= 0.4 && d.gaps[0]) weaknesses.push(d.gaps[0])
  }

  // --- the ranker: what to fix first -----------------------------------------
  const recommendations = rankRecommendations(dimensions, scenario)

  const confidence = dimensions.reduce<'high' | 'medium' | 'low'>((lowest, d) => {
    return CONFIDENCE_RANK[d.confidence] < CONFIDENCE_RANK[lowest] ? d.confidence : lowest
  }, 'high')

  return {
    scenario,
    scenarioLabel: SCENARIO_LABELS[scenario],
    finalScore,
    band: { key: bandKey, label: bandCopy.label, message: bandCopy.message },
    dimensions,
    strengths,
    weaknesses,
    recommendations,
    confidence,
    lowResumeSignal,
  }
}

function situationEvidence(scenario: Scenario): string {
  switch (scenario) {
    case 'currently_in_gulf':
      return 'You are currently in the Gulf market and immediately accessible to employers'
    case 'returner':
      return 'You have proven Gulf experience to build a re-entry case on'
    case 'experienced':
      return 'You have professional experience that can transfer to the Gulf market'
    case 'fresher':
      return ''
  }
}

/**
 * Rank the gaps by impact and difficulty so the user is told where to start.
 *
 * Impact is derived from the dimension's own weight — a gap in a 30-point
 * dimension matters more than one in a 5-point dimension, on the exact numbers the
 * user is looking at. Difficulty is a fixed, honest estimate per dimension: adding
 * a summary or quantifying achievements is quick; earning a certification is not.
 */
const DIFFICULTY: Record<DimensionKey, Recommendation['difficulty']> = {
  gulf_market_position: 'high',
  work_experience: 'high',
  skills: 'low',
  education: 'high',
  certifications: 'medium',
  resume_quality: 'low',
}

function rankRecommendations(dimensions: DimensionResult[], scenario: Scenario): Recommendation[] {
  const recs: Recommendation[] = []

  for (const d of dimensions) {
    if (d.max === 0) continue
    const shortfall = d.max - d.score
    // Ignore near-complete dimensions and the auto-filled situation dimension.
    if (shortfall < d.max * 0.25 || d.key === 'gulf_market_position') continue

    const impact: Recommendation['impact'] = shortfall >= 18 ? 'high' : shortfall >= 8 ? 'medium' : 'low'
    const difficulty = DIFFICULTY[d.key]
    // Priority: reward high impact, favour low difficulty. Pure sort key.
    const impactScore = { high: 3, medium: 2, low: 1 }[impact]
    const diffScore = { low: 3, medium: 2, high: 1 }[difficulty]
    recs.push({
      title: recTitle(d.key, scenario),
      why: d.gaps[0] ?? `Strengthen your ${d.label.toLowerCase()}.`,
      impact,
      difficulty,
      priority: impactScore * 10 + diffScore,
    })
  }

  return recs.sort((a, b) => b.priority - a.priority)
}

function recTitle(key: DimensionKey, scenario: Scenario): string {
  switch (key) {
    case 'resume_quality':
      return 'Quantify your achievements and add a targeted summary'
    case 'skills':
      return 'Add a clear, relevant skills section'
    case 'certifications':
      return 'Add a Gulf-relevant certification'
    case 'education':
      return 'Make your education and qualifications clear'
    case 'work_experience':
      return scenario === 'fresher'
        ? 'Add projects, internships or training to show practical ability'
        : 'Present your work history with clear dates and scope'
    case 'gulf_market_position':
      return ''
  }
}
