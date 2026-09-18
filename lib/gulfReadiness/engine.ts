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
  detectGulfSignals,
  detectWorkExperience,
  isLowSignal,
  wordCount,
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
  const text = input.resumeText ?? ''
  const words = wordCount(text)
  // Thin text cannot carry a high score, whatever keywords it contains
  // (2026-09-18: twelve lines of keywords scored 99). Under 60 words is not a
  // CV; under 120 is a fragment.
  const lowResumeSignal = isLowSignal(text) || words < 60
  const scoreCap = lowResumeSignal ? 35 : words < 120 ? 70 : 100
  const gulf = detectGulfSignals(text)

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
  // For a Gulf scenario the full points need the CV to SHOW the Gulf — a
  // place, a Gulf client or a Gulf phone number. The checkbox alone earns 60%:
  // a recruiter reading the CV cannot see an answer the candidate gave us.
  if (SITUATION_POINTS[scenario] > 0) {
    const max = SITUATION_POINTS[scenario]
    const gulfScenario = scenario === 'currently_in_gulf' || scenario === 'returner'
    const shown = !gulfScenario || gulf.corroborated
    const evidence = [situationEvidence(scenario)]
    if (gulfScenario && gulf.corroborated) evidence.push(gulfEvidence(gulf))
    dimensions.push({
      key: 'gulf_market_position',
      label: DIMENSION_LABELS.gulf_market_position,
      score: shown ? max : Math.round(max * 0.6),
      max,
      evidence,
      gaps: shown
        ? []
        : ['Your CV does not show any Gulf location, employer or phone number — add them so a recruiter can see your Gulf experience'],
      confidence: shown ? 'high' : 'medium',
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

  const finalScore = Math.min(scoreCap, dimensions.reduce((sum, d) => sum + d.score, 0))

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
  addNextSteps(recommendations, dimensions, scenario, gulf, lowResumeSignal)
  recommendations.sort((a, b) => b.priority - a.priority)

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
      dimension: d.key,
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

function gulfEvidence(g: ReturnType<typeof detectGulfSignals>): string {
  const named = [...g.clients.slice(0, 2), ...g.places.slice(0, 2)].map((x) => x.replace(/\b\w/g, (c) => c.toUpperCase()))
  return named.length ? `Your CV shows Gulf work: ${named.join(', ')}` : 'Your CV shows a Gulf contact number'
}

/**
 * The ranker only lists real shortfalls, so a strong CV used to get none — no
 * reason to go further, and the most qualified users are exactly the ones who
 * should tailor next. These are honest next steps, ranked below every real
 * shortfall and never counted in the score.
 */
function addNextSteps(
  recs: Recommendation[],
  dimensions: DimensionResult[],
  scenario: Scenario,
  gulf: ReturnType<typeof detectGulfSignals>,
  lowSignal: boolean,
): void {
  const has = (k: DimensionKey) => recs.some((r) => r.dimension === k)
  const push = (dimension: DimensionKey, title: string, why: string, priority: number) =>
    recs.push({ dimension, title, why, impact: 'medium', difficulty: 'low', priority })

  const market = dimensions.find((d) => d.key === 'gulf_market_position')
  if (market && market.score < market.max && market.gaps[0]) {
    push('gulf_market_position', 'Show your Gulf experience on the CV', market.gaps[0], 12)
  }

  // Declared "no Gulf experience", but the CV clearly shows Gulf work.
  if ((scenario === 'experienced' || scenario === 'fresher') && gulf.corroborated && gulf.kinds >= 2) {
    push('gulf_market_position', 'Your CV shows Gulf work — answer "Yes" to Gulf experience', 'You are being scored as a candidate without Gulf experience, which undersells you.', 9)
  }
  if (lowSignal) return

  // A real gap too small for the ranker is still worth saying.
  for (const d of dimensions) {
    if (d.key === 'gulf_market_position' || has(d.key) || d.score >= d.max || !d.gaps[0]) continue
    push(d.key, recTitle(d.key, scenario), d.gaps[0], 6)
  }
  if (recs.length >= 4) return

  const quality = dimensions.find((d) => d.key === 'resume_quality')
  const essentialsGap = quality?.gaps.find((g) => g.startsWith('State your'))
  if (essentialsGap && !has('resume_quality')) push('resume_quality', 'Put your visa, notice period and nationality at the top', essentialsGap, 5)
  const skills = dimensions.find((d) => d.key === 'skills')
  const skillsGap = skills?.gaps.find((g) => /too many|Only \d+ skills/.test(g))
  if (skillsGap && !has('skills')) push('skills', 'Tighten your skills section', skillsGap, 4)
  push(
    'resume_quality',
    'Tailor your CV to each job description',
    'A strong general CV still gets filtered when it does not use the words of the specific job. Match each application to its job description.',
    3,
  )
  if (recs.length < 3) {
    push('resume_quality', 'Lead your summary with your three strongest numbers', 'Recruiters spend seconds on the top third of the page — put your biggest scope, team size or result there.', 2)
  }
}
