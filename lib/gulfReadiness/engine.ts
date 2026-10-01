import type {
  DimensionKey,
  DimensionResult,
  FunnelAnswers,
  GulfFacts,
  GulfReadinessInput,
  GulfReadinessResult,
  MustHave,
  Recommendation,
  Scenario,
  Verdict,
} from '@/lib/gulfReadiness/types'
import {
  BAND_MESSAGES,
  DIMENSION_LABELS,
  SCENARIO_LABELS,
  SCENARIO_WEIGHTS,
  PHOTO_POINTS,
  SITUATION_POINTS,
  VERDICT_COPY,
  bandKeyFor,
} from '@/lib/gulfReadiness/config'
import { detectGulfEssentials, essentialsRatio, type EssentialItem } from '@/lib/gulfReadiness/essentials'
import { evaluateMustHaves } from '@/lib/gulfReadiness/mustHaves'
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
  const facts = input.facts ?? {}
  const essentials = detectGulfEssentials(text, facts, scenario === 'currently_in_gulf')
  const detectors: Record<Exclude<DimensionKey, 'gulf_market_position'>, DetectorOutput> = {
    work_experience: scenario === 'fresher' ? detectProjects(text) : detectWorkExperience(text),
    skills: detectSkills(text),
    education: detectEducation(text),
    certifications: withLicence(detectCertifications(text), facts),
    gulf_essentials: essentialsDetector(essentials),
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

  for (const key of ['work_experience', 'skills', 'education', 'certifications', 'gulf_essentials', 'resume_quality'] as const) {
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

  // --- the must-haves and the verdict (v2) -----------------------------------
  const mustHaves = evaluateMustHaves(text, facts, input.today ?? new Date())
  const verdict = verdictFor(finalScore, mustHaves)

  // --- the guided path: paperwork, then profile, then apply -------------------
  const recommendations = rankRecommendations(dimensions, scenario)
  addEssentialSteps(recommendations, essentials)
  addNextSteps(recommendations, dimensions, scenario, gulf, lowResumeSignal)
  addPaperworkSteps(recommendations, mustHaves)
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
    verdict,
    mustHaves,
  }
}

// ---------------------------------------------------------------------------
// v2 helpers (2026-10-01)
// ---------------------------------------------------------------------------

/** Gulf CV Essentials as a dimension: ratio over what could be judged, evidence and gaps per item. */
function essentialsDetector(items: EssentialItem[]): DetectorOutput {
  const LABEL: Record<EssentialItem['key'], string> = {
    photo: 'A professional photo',
    notice: 'A short notice period',
    visa_or_passport: 'Your visa or passport position',
    whatsapp: 'A WhatsApp number',
    arabic: 'Arabic',
    driving_licence: 'A Gulf driving licence',
    nationality_location: 'Nationality and location stated',
  }
  const full = items.filter((i) => i.applicable && i.earned >= i.max).map((i) => LABEL[i.key])
  return {
    ratio: essentialsRatio(items),
    evidence: full.length ? [`Gulf essentials in place: ${full.join(', ')}`] : [],
    gaps: items.filter((i) => i.applicable && i.gap).map((i) => i.gap!.why),
    confidence: items.some((i) => !i.applicable) ? 'medium' : 'high',
  }
}

/** A licence the user says they hold counts as a recognised certification. */
function withLicence(d: DetectorOutput, facts: GulfFacts): DetectorOutput {
  if (facts.professionalLicence !== 'done' || d.ratio >= 1) return d
  return { ...d, ratio: Math.min(1, d.ratio + 0.3), evidence: [...d.evidence, 'A professional licence'] }
}

/** Each essential with something left becomes its own step, worth its real points. */
function addEssentialSteps(recs: Recommendation[], items: EssentialItem[]): void {
  for (const i of items) {
    if (!i.applicable || !i.gap) continue
    const gain = Math.round((i.max - i.earned) * 10) / 10
    if (gain <= 0) continue
    recs.push({
      dimension: 'gulf_essentials',
      title: i.gap.title,
      why: i.gap.why,
      impact: gain >= 4 ? 'high' : gain >= 2 ? 'medium' : 'low',
      difficulty: i.key === 'arabic' ? 'high' : 'low',
      // Quick, concrete, worth real points: above the generic steps, below paperwork.
      priority: 20 + gain * 2 + (i.key === 'arabic' ? -8 : 0),
      stage: 'profile',
      gain,
      // A shown-but-unconfirmed photo is fixed at the checklist, not the upload.
      field: i.key === 'photo' && i.earned === PHOTO_POINTS.shown ? 'photo_checklist_confirmed' : ESSENTIAL_FIELD[i.key],
    })
  }
}

const ESSENTIAL_FIELD: Record<EssentialItem['key'], string> = {
  photo: 'photo',
  notice: 'notice_period',
  visa_or_passport: 'visa_status',
  whatsapp: 'whatsapp',
  arabic: 'arabic_level',
  driving_licence: 'has_driving_license',
  nationality_location: 'nationality',
}

/** Plain action titles for each must-have, by status. */
const PAPERWORK_TITLE: Record<MustHave['key'], Record<Exclude<MustHave['status'], 'ok'>, string>> = {
  passport: { missing: 'Renew your passport', in_progress: 'Finish renewing your passport', unknown: 'Add your passport expiry date' },
  degree_attestation: { missing: 'Get your degree attested', in_progress: 'Finish your degree attestation', unknown: 'Tell us if your degree is attested' },
  saudi_verification: { missing: 'Get Saudi professional verification (QVP / SVP)', in_progress: 'Finish your Saudi professional verification', unknown: 'Tell us your Saudi verification status' },
  professional_licence: { missing: 'Get your professional licence', in_progress: 'Finish your professional licence', unknown: 'Tell us your professional licence status' },
}

/** Must-haves not yet done lead the path. */
function addPaperworkSteps(recs: Recommendation[], mustHaves: MustHave[]): void {
  for (const m of mustHaves) {
    if (m.status === 'ok') continue
    recs.push({
      dimension: 'gulf_essentials',
      title: PAPERWORK_TITLE[m.key][m.status as Exclude<MustHave['status'], 'ok'>],
      why: m.why,
      impact: 'high',
      difficulty: m.key === 'passport' && m.status === 'unknown' ? 'low' : 'high',
      priority: m.status === 'missing' ? 70 : m.status === 'in_progress' ? 65 : 60,
      stage: 'paperwork',
      steps: m.steps,
      field: m.field,
    })
  }
}

/**
 * Ready / almost / not ready — from the score AND the must-haves. A blocker
 * outranks any score; a must-have not yet answered keeps a high score at
 * "almost" (we have not checked it), never at "not ready".
 */
export function verdictFor(score: number, mustHaves: MustHave[]): Verdict {
  const blockers = mustHaves.filter((m) => m.status === 'missing').length
  const pending = mustHaves.filter((m) => m.status === 'in_progress' || m.status === 'unknown').length
  const key: Verdict['key'] = blockers > 0 || score < 50 ? 'not_ready' : pending > 0 || score < 75 ? 'almost' : 'ready'
  const copy = VERDICT_COPY[key]
  // The label names the REAL reason, so a low CV score is never presented as a
  // paperwork problem, and an unchecked item never as a blocker.
  const steps = (n: number) => `${n} paperwork step${n === 1 ? '' : 's'}`
  const label =
    key === 'ready' ? copy.label
    : key === 'not_ready' ? (blockers > 0 ? `${copy.label} — ${steps(blockers)} to sort out` : `${copy.label} — strengthen your CV first`)
    : pending > 0 ? `${copy.label} — ${steps(pending)} to check` : `${copy.label} — a few profile fixes left`
  return { key, label, message: copy.message, blockers, pending }
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
  gulf_essentials: 'low',
  resume_quality: 'low',
}

function rankRecommendations(dimensions: DimensionResult[], scenario: Scenario): Recommendation[] {
  const recs: Recommendation[] = []

  for (const d of dimensions) {
    if (d.max === 0) continue
    const shortfall = d.max - d.score
    // Ignore near-complete dimensions and the auto-filled situation dimension.
    // Essentials are listed item by item (addEssentialSteps), each with its real points.
    if (shortfall < d.max * 0.25 || d.key === 'gulf_market_position' || d.key === 'gulf_essentials') continue

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
    case 'gulf_essentials':
      return 'Complete your Gulf CV essentials'
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
    if (d.key === 'gulf_market_position' || d.key === 'gulf_essentials' || has(d.key) || d.score >= d.max || !d.gaps[0]) continue
    push(d.key, recTitle(d.key, scenario), d.gaps[0], 6)
  }
  // The last stage of the path is always there: apply, tailored to each job.
  recs.push({
    dimension: 'resume_quality',
    title: 'Tailor your CV to each job description',
    why: 'A strong general CV still gets filtered when it does not use the words of the specific job. Match each application to its job description.',
    impact: 'medium',
    difficulty: 'low',
    priority: 3,
    stage: 'apply',
  })
  if (recs.length >= 5) return

  const skills = dimensions.find((d) => d.key === 'skills')
  const skillsGap = skills?.gaps.find((g) => /too many|Only \d+ skills/.test(g))
  if (skillsGap && !has('skills')) push('skills', 'Tighten your skills section', skillsGap, 4)
  if (recs.length < 3) {
    push('resume_quality', 'Lead your summary with your three strongest numbers', 'Recruiters spend seconds on the top third of the page — put your biggest scope, team size or result there.', 2)
  }
}
