/**
 * Optimizer engine — offline suite (2026-09-17). docs/17_OPTIMIZER_ENGINE.md.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-optimizer-engine.ts
 *
 * No AI call, no network, no database. Every model call in the pipeline is a
 * scripted fake, so each safety property is exercised on purpose:
 * evidence is literal or quote-verified, the score is deterministic and cannot
 * be raised by a gap, the quality gate catches what grounding cannot, the
 * review's findings are enforced, repairs are targeted, a failed block keeps
 * the candidate's own words, and the score never goes down.
 */

import './resolve-paths'
import type { CareerProfileFull } from '../types/careerProfile'
import { containsTermInSentence, containsTermRaw, deriveAcronym, stem, containsQuote } from '../lib/optimizer/text'
import { bridgeIsPlausible, buildEvidenceMap, sameSentenceBridges, verifyBridges } from '../lib/optimizer/evidence'
import { validateTargetProfile } from '../lib/optimizer/jobAnalysis'
import { maxAchievableBreakdown, maxAchievableScore, projectedScore, scoreDocumentFromResume, scoreResume } from '../lib/optimizer/score'
import { buildTailoringPlan, renderPlanForPrompt } from '../lib/optimizer/plan'
import { checkQuality } from '../lib/optimizer/qualityGate'
import { parseReview } from '../lib/optimizer/review'
import { analyzeTargetWithEvidence, baselineDocument, buildAnalysisReport, type GenerateCall } from '../lib/optimizer/analyze'
import { factSummary } from '../lib/optimizer/factSummary'
import { reportForSavedDocument } from '../lib/optimizer/savedReport'
import { normalizeSectionOutput, runOptimizationPipeline } from '../lib/optimizer/pipeline'
import { cutOutcomeTail, pruneSummary } from '../lib/optimizer/autofix'
import { applySuggestionsToDocument, skillSuggestions, suggestionRequirements, validateSuggestions } from '../lib/optimizer/suggestions'
import { validateGrounding } from '../lib/ai/validateGrounding'
import type { JobTargetProfile } from '../lib/optimizer/types'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}
function section(t: string) {
  console.log(`\n${t}`)
}

// ---- Fixtures ------------------------------------------------------------------

function makeProfile(): CareerProfileFull {
  return {
    id: 'p1',
    user_id: 'u1',
    full_name: 'Test Candidate',
    phone: '+971500000000',
    email: 'candidate@example.com',
    professional_summary: 'Maintenance engineer with 8+ years in facilities maintenance across hospitals and malls.',
    target_job_title: null,
    field_visibility: {} as CareerProfileFull['field_visibility'],
    has_driving_license: true,
    work_experience: [
      {
        id: 'e1',
        profile_id: 'p1',
        company: 'Gulf Facilities LLC',
        role: 'Maintenance Engineer',
        location: 'Dubai, UAE',
        start_date: '2019-01-01',
        end_date: null,
        description: 'Responsible for HVAC and chiller plant maintenance for a 400-bed hospital.',
        highlights: [
          'Scheduled planned preventive maintenance for 120 chillers and AHUs',
          'Used a computerised maintenance management system to track 300 work orders monthly',
          'Supported shutdown works with the operations team',
        ],
        sort_order: 0,
      },
      {
        id: 'e2',
        profile_id: 'p1',
        company: 'City Mall Services',
        role: 'Technician',
        location: 'Abu Dhabi, UAE',
        start_date: '2015-01-01',
        end_date: '2018-12-01',
        description: null,
        highlights: ['Repaired electrical panels and lighting', 'Maintained fire alarm systems'],
        sort_order: 1,
      },
      {
        id: 'e3',
        profile_id: 'p1',
        company: 'Retail Co',
        role: 'Sales Assistant',
        location: 'Chennai, India',
        start_date: '2012-01-01',
        end_date: '2014-12-01',
        description: null,
        highlights: ['Served customers', 'Handled cash desk', 'Arranged stock displays', 'Opened the store'],
        sort_order: 2,
      },
    ],
    skills: [
      { id: 's1', profile_id: 'p1', name: 'AutoCAD', sort_order: 0 },
      { id: 's2', profile_id: 'p1', name: 'HVAC', sort_order: 1 },
    ],
    certifications: [{ id: 'c1', profile_id: 'p1', name: 'OSHA 30', issuer: null, issue_date: null, sort_order: 0 }],
    education: [{ id: 'd1', profile_id: 'p1', degree: 'B.E.', field_of_study: 'Mechanical Engineering', institution: 'Anna University', start_year: 2008, end_year: 2012, sort_order: 0 }],
    additional_information: [],
  } as unknown as CareerProfileFull
}

function makeTarget(): JobTargetProfile {
  const t = validateTargetProfile(
    {
      job_title: 'Facilities Maintenance Engineer',
      title_variants: ['Maintenance Engineer'],
      keywords: [
        { term: 'preventive maintenance', aliases: ['PPM'], importance: 'must', kind: 'responsibility' },
        { term: 'CMMS', aliases: [], importance: 'must', kind: 'tool' },
        { term: 'HVAC', aliases: [], importance: 'must', kind: 'skill' },
        { term: 'AutoCAD', aliases: [], importance: 'nice', kind: 'tool' },
        { term: 'SAP PM', aliases: [], importance: 'must', kind: 'tool' },
        { term: 'NEBOSH', aliases: [], importance: 'nice', kind: 'certification' },
      ],
      required_skills: ['HVAC', 'CMMS'],
      preferred_skills: [],
      responsibilities: [],
      required_experience_years: 5,
      industry: null,
      gcc_experience_required: true,
      gcc_experience_preferred: false,
      target_countries: ['uae'],
      education_requirements: ["Bachelor's in Mechanical Engineering"],
      certification_requirements: [],
      driving_license_required: false,
    },
    'job_description',
    'Facilities Maintenance Engineer',
  )
  if (!t) throw new Error('fixture target failed to validate')
  return t
}

const JD = 'We need a Facilities Maintenance Engineer. Must know preventive maintenance, CMMS, HVAC and SAP PM. NEBOSH is a plus.'

// ---- 1. Matching -------------------------------------------------------------
section('1. Term matching')
check('stemming: commissioning ~ commissioned', stem('commissioning') === stem('commissioned'))
check('plural: chillers ~ chiller', containsTermRaw('serviced 12 chillers', 'chiller'))
check('alias: PPM matches preventive maintenance term', containsTermRaw('Ran the PPM programme', 'preventive maintenance', ['PPM']))
check('multi-word terms must be contiguous', !containsTermRaw('project cost management', 'project management'))
check('derived acronym for 3+ words', deriveAcronym('Health Safety and Environment') === 'hse')
check('c++ survives tokenising', containsTermRaw('Wrote C++ services', 'C++'))
check('in-sentence: word order and forms are free', containsTermInSentence('Monitored hemodynamic status every hour', 'hemodynamic monitoring'))
check('in-sentence: a hyphenated compound stays one unit ("6+ years … month-end close" is not "year-end closing")', !containsTermInSentence('Accountant with 6+ years in general ledger, month-end close and VAT compliance.', 'year-end closing'))
check('in-sentence: the compound itself still matches', containsTermInSentence('Handled month-end close for 3 entities', 'month-end closing'))
{
  // The live I&C package (2026-09-17): every one of these read as "missing".
  const kw = validateTargetProfile({ keywords: [
    { term: 'Distributed Control Systems (DCS)', importance: 'must', kind: 'tool' },
    { term: 'SPI (SmartPlant Instrumentation / Intoals)', importance: 'nice', kind: 'tool' },
    { term: 'Instrumentation & Control (I&C) design', importance: 'must', kind: 'responsibility' },
  ] }, 'job_description', 'I&C Engineer')!.keywords
  const find = (t: string) => kw.find((k) => k.term === t)!
  check('bracketed acronym becomes an alternative', find('Distributed Control Systems').aliases.includes('DCS'))
  check('re-validating a stored split keyword keeps it', validateTargetProfile({ keywords: kw }, 'job_description', 'X')!.keywords[0].aliases.includes('DCS'))
  check('"DCS Validation" satisfies Distributed Control Systems (DCS)', containsTermRaw('DCS Validation', 'Distributed Control Systems', find('Distributed Control Systems').aliases))
  check('"SmartPlant Instrumentation (SPI/INtools)" satisfies SPI', containsTermRaw('SmartPlant Instrumentation (SPI/INtools)', 'SPI', find('SPI').aliases))
  check('mid-term brackets: "I&C design" variant', find('Instrumentation & Control design').aliases.includes('I&C design'))
  check('"&" abbreviations: "C&E matrices" satisfies Cause & Effect Matrices', containsTermRaw('P&ID review, C&E matrices, control narratives', 'Cause & Effect Matrices'))
  check('"Fire & Gas (FGS)" satisfies Fire and Gas Systems', containsTermRaw('Fire & Gas (FGS)', 'Fire and Gas Systems', ['FGS']))
  check('"SIS/ESD/F&G/BMS" keeps each abbreviation', containsTermRaw('SIS/ESD/F&G/BMS Commissioning', 'Safety Instrumented Systems', ['SIS']) && containsTermRaw('SIS/ESD/F&G/BMS Commissioning', 'F&G'))
  check('"I&C" alone does not satisfy "I&C design"', !containsTermRaw('I&C Pre-Commissioning Engineer', 'Instrumentation & Control design', find('Instrumentation & Control design').aliases))
}
check('quote check is whitespace/case tolerant', containsQuote('Used  a Computerised system', 'used a computerised system'))

// ---- 2. Evidence -------------------------------------------------------------
section('2. Evidence map + bridge verification')
const profile = makeProfile()
const target = makeTarget()
const bridges = verifyBridges(profile, target, [
  { term: 'CMMS', location: 'e1', quote: 'Used a computerised maintenance management system' },
  { term: 'SAP PM', location: 'e1', quote: 'Used SAP PM daily' }, // not verbatim -> dropped
  { term: 'NEBOSH', location: 'nope', quote: 'OSHA 30' }, // unknown location -> dropped
  { term: 'Invented', location: 'e1', quote: 'Scheduled planned preventive maintenance' }, // unknown term -> dropped
])
check('only the verbatim, known bridge survives', bridges.length === 1 && bridges[0].term === 'CMMS')
const ev = buildEvidenceMap(profile, target, bridges)
const byTerm = (t: string) => ev.keywords.find((k) => k.term === t)!
check('literal term in a role is matched there', byTerm('preventive maintenance').literalEntryIds.includes('e1'))
check('bridged term is supported and placeable in its role', byTerm('CMMS').status === 'supported' && byTerm('CMMS').placeable.includes('e1'))
check('skills-list-only term is "listed"', byTerm('AutoCAD').status === 'listed')
check('unsupported term is a gap and placeable nowhere', byTerm('SAP PM').status === 'gap' && byTerm('SAP PM').placeable.length === 0)
check('bridged term goes on the validator allow-list for its role', (ev.approvedTerms.get('e1') ?? []).includes('CMMS'))
check('gap never reaches the allow-list', ![...ev.approvedTerms.values()].flat().includes('SAP PM'))

section('2b. Bridge plausibility (cases measured on live output, 2026-09-17)')
const plausible = (term: string, quote: string, kind: 'skill' | 'tool' | 'soft_skill' = 'skill', aliases: string[] = []) =>
  bridgeIsPlausible({ term, aliases, kind }, quote)
check('rejects CRM <- "Key account management"', !plausible('CRM', 'Key account management', 'tool'))
check('rejects Strategic Planning <- a sales result', !plausible('Strategic Planning', 'Achieved 112% of the annual sales target in 2023'))
check('rejects Relationship Management <- "Key account management" (shared generic word only)', !plausible('Relationship Management', 'Key account management'))
check('rejects Revenue Growth <- "Achieved 112% of target"', !plausible('Revenue Growth', 'Achieved 112% of the annual sales target'))
check('business wording: "Business Development" <- "Developed new business with 12 retail accounts"', plausible('Business Development', 'Developed new business with 12 retail accounts'))
check('business wording still needs every word: "Business Development" <- "Developed the onboarding app"', !plausible('Business Development', 'Developed the onboarding app'))
check('never bridges a soft skill', !plausible('Communication skills', 'Communicated with store buyers weekly', 'soft_skill'))
check('rejects a bridge missing a distinctive word: mechanical ventilation <- "Cared for ventilated patients"', !plausible('mechanical ventilation', 'Cared for ventilated patients'))
check('rejects SAP FICO <- "...12 accounts in SAP"', !plausible('SAP FICO', 'Performed bank reconciliations for 12 accounts in SAP', 'tool'))
check('rejects a graded requirement: advanced Excel <- "Excel"', !plausible('advanced Excel', 'Excel', 'tool'))
check('rejects year-end closing <- "6+ years … month-end close" (live bridge)', !plausible('year-end closing', 'Accountant with 6+ years in general ledger, month-end close and VAT compliance.'))
check('rejects month-end AND year-end closing <- "month-end close"', !plausible('month-end and year-end closing', 'month-end close and VAT compliance'))
check('degree abbreviations: Bachelor of Science in Nursing <- "B.Sc Nursing"', plausible('Bachelor of Science in Nursing', 'B.Sc Nursing Kerala University'))
check('accepts Project coordination <- "Coordinated shop drawings" (generic word ignored)', plausible('Project coordination', 'Coordinated shop drawings with the consultant'))
check('accepts medication administration <- "Administered IV medications"', plausible('medication administration', 'Administered IV medications and titrated infusions'))
check('accepts an acronym spelled out, British spelling', plausible('CMMS', 'Used a computerised maintenance management system', 'tool'))
check('verifyBridges applies plausibility', verifyBridges(makeProfile(), makeTarget(), [{ term: 'HVAC', location: 'e2', quote: 'Maintained fire alarm systems' }]).length === 0)
const ssb = sameSentenceBridges(
  { ...makeProfile(), work_experience: [{ ...makeProfile().work_experience[0], highlights: ['Filed quarterly UAE VAT returns and reconciled input and output tax'] }] } as CareerProfileFull,
  { ...makeTarget(), keywords: [{ term: 'VAT return filing', aliases: [], importance: 'must', kind: 'responsibility' }, { term: 'advanced Excel', aliases: [], importance: 'must', kind: 'skill' }] },
)
check('same-sentence evidence: "Filed quarterly UAE VAT returns" proves "VAT return filing"', ssb.some((b) => b.term === 'VAT return filing'))
check('same-sentence evidence never proves a graded skill ("advanced Excel")', !ssb.some((b) => b.term === 'advanced Excel'))
{
  const alt = validateTargetProfile({ keywords: [{ term: 'CPA', aliases: [], alternatives: ['ACCA'], importance: 'nice', kind: 'certification' }] }, 'job_description', 'X')!
  check('either/or requirements keep their alternatives, and survive re-validation', alt.keywords[0].aliases.includes('ACCA') && validateTargetProfile({ keywords: alt.keywords }, 'job_description', 'X')!.keywords[0].aliases.includes('ACCA'))
  const p = { ...makeProfile(), certifications: [{ id: 'c9', profile_id: 'p1', name: 'ACCA', issuer: null, issue_date: null, sort_order: 0 }] } as unknown as CareerProfileFull
  const evAlt = buildEvidenceMap(p, alt, [])
  check('holding ANY one alternative satisfies the requirement', evAlt.keywords[0].status !== 'gap')
  const bridged = buildEvidenceMap(makeProfile(), { ...alt, keywords: [{ term: 'CMMS', aliases: ['SAP PM'], alternatives: ['SAP PM'], importance: 'must', kind: 'tool' }] }, [{ term: 'CMMS', location: 'e1', quote: 'Used a computerised maintenance management system' }])
  check('a bridge approves only the spelling its quote proves', (bridged.approvedTerms.get('e1') ?? []).join() === 'CMMS')
}
check('aliases that are only related skills are dropped', (validateTargetProfile({ keywords: [{ term: 'Microsoft Office', aliases: ['Excel', 'MS Office'], importance: 'must', kind: 'tool' }] }, 'target_title_only', 'X')!.keywords[0].aliases).join() === 'MS Office')

// ---- 3. Score ----------------------------------------------------------------
section('3. Deterministic score')
const baseDoc = scoreDocumentFromResume(baselineDocument(profile, target.job_title))
const s1 = scoreResume(baseDoc, target, 80)
const s2 = scoreResume(baseDoc, target, 80)
check('same input, same score', JSON.stringify(s1) === JSON.stringify(s2))
check('score is 0–100', s1.total >= 0 && s1.total <= 100)
const improvedDoc = {
  ...baseDoc,
  experience: baseDoc.experience.map((e) =>
    e.entryId === 'e1' ? { ...e, bullets: [...e.bullets, 'Tracked 300 monthly work orders in the CMMS'] } : e,
  ),
}
check('placing a supported term raises the score', scoreResume(improvedDoc, target, 80).total > s1.total)
const stuffedDoc = { ...baseDoc, summary: baseDoc.summary + ' SAP PM SAP PM NEBOSH' }
check('keyword credit is capped at 1 per term (no stuffing gain beyond presence)',
  scoreResume(stuffedDoc, target, 80).keywords.find((k) => k.term === 'SAP PM')!.credit === 1)
const max = maxAchievableScore(baseDoc, target, ev.keywords, 80, { summary: true, experienceIds: ['e1', 'e2', 'e3'] })
check('honest max >= before', max >= s1.total)
const maxNoSel = maxAchievableScore(baseDoc, target, ev.keywords, 80, { summary: false, experienceIds: [] })
check('selecting nothing gives no keyword gain', maxNoSel === s1.total)
const fullMax = maxAchievableBreakdown(baseDoc, target, ev.keywords, 80, { summary: true, experienceIds: ['e1', 'e2', 'e3'] })
check('a gap earns no credit in the honest max', fullMax.keywords.find((k) => k.term === 'SAP PM')!.credit === 0)
check('a bridged term earns full credit in the honest max', fullMax.keywords.find((k) => k.term === 'CMMS')!.credit === 1)
check('projections rise with level', projectedScore(50, 80, 'easy') <= projectedScore(50, 80, 'moderate') && projectedScore(50, 80, 'moderate') <= projectedScore(50, 80, 'high'))
const titleOnly: JobTargetProfile = { ...target, mode: 'target_title_only', structured: null }
const rep = buildAnalysisReport({ profile, target: titleOnly, bridges, analysisId: null, targetJobTitle: target.job_title })
check('title mode has no qualification part', rep.qualifications === null && rep.before.parts.qualifications === null)

// ---- 4. Plan -----------------------------------------------------------------
section('4. Tailoring plan')
const plan = buildTailoringPlan(profile, ev, 'job_description', 'high')
check('term already in bullets is KEEP', plan.entries.e1.keepTerms.includes('preventive maintenance'))
check('term only in the description is USE (bullets may now state it)', plan.entries.e1.useTerms.some((u) => u.term === 'HVAC'))
check('bridged term is USE with its quote', plan.entries.e1.useTerms.some((u) => u.term === 'CMMS' && u.quote !== null))
check('most relevant recent role is primary', plan.entries.e1.tier === 'primary')
check('irrelevant old role is condensed at high', plan.entries.e3.tier === 'condensed' && plan.entries.e3.maxBullets === 3)
check('moderate never condenses', buildTailoringPlan(profile, ev, 'job_description', 'moderate').entries.e3.maxBullets === null)
check('gaps listed', plan.gaps.includes('SAP PM') && plan.gaps.includes('NEBOSH'))
const rendered = renderPlanForPrompt(plan, true, ['e1'], profile)
check('rendered plan forbids gaps', /FORBIDDEN[^\n]*SAP PM/.test(rendered))
check('rendered plan states the years rule from the profile', rendered.includes('"8+ years"'))
check('rendered plan scoped to the section', rendered.includes('[id: e1]') && !rendered.includes('[id: e2]'))

// ---- 5. Quality gate ----------------------------------------------------------
section('5. Quality gate')
const gate = (summary: string | null, bullets: string[], entryId = 'e1', level: 'easy' | 'moderate' | 'high' = 'moderate') =>
  checkQuality({ profile, plan: buildTailoringPlan(profile, ev, 'job_description', level), evidence: ev, level, summary, blocks: [{ entryId, bullets }] })
const codes = (xs: ReturnType<typeof gate>, sev?: 'hard' | 'soft') => xs.filter((x) => !sev || x.severity === sev).map((x) => x.code)
check('banned hype word is hard', codes(gate('Seasoned maintenance engineer with 8+ years in HVAC and preventive maintenance for hospitals and malls across the UAE region today.', []), 'hard').includes('banned_word'))
check('"led" without source authority is hard', codes(gate(null, ['Led shutdown works with the operations team', 'Scheduled planned preventive maintenance for 120 chillers', 'Tracked 300 work orders in the CMMS'])).includes('promoted_involvement'))
check('"managed" allowed when the role title carries authority',
  !codes(checkQuality({ profile: { ...profile, work_experience: profile.work_experience.map((e) => (e.id === 'e1' ? { ...e, role: 'Maintenance Manager' } : e)) } as CareerProfileFull, plan: null, evidence: ev, level: 'moderate', summary: null, blocks: [{ entryId: 'e1', bullets: ['Managed preventive maintenance for 120 chillers'] }] })).includes('promoted_involvement'))
check('"lead time" is not a leadership claim', !codes(gate(null, ['Cut spare-part lead time using the CMMS for 120 chillers'])).includes('promoted_involvement'))
check('gap term in output is hard', codes(gate(null, ['Scheduled preventive maintenance in SAP PM for 120 chillers']), 'hard').includes('forbidden_gap_term'))
check('dropping a KEEP term is soft', codes(gate(null, ['Tracked 300 work orders in the CMMS for HVAC plant', 'Supported shutdown works with operations']), 'soft').includes('lost_keyword'))
check('missing USE terms at high is soft coverage', codes(gate(null, ['Scheduled preventive maintenance for 120 chillers and AHUs'], 'e1', 'high'), 'soft').includes('coverage_below_level'))
check('", ensuring accuracy" filler is hard when the source never says it', codes(gate(null, ['Tracked 300 work orders in the CMMS, ensuring accuracy and compliance']), 'hard').includes('unstated_outcome'))
check('"to maintain accurate records" filler is hard', codes(gate(null, ['Recorded 300 work orders to maintain accurate site records']), 'hard').includes('unstated_outcome'))
check('"Label:" bullet prefix is soft', codes(gate(null, ['Preventive maintenance: scheduled work for 120 chillers and AHUs']), 'soft').includes('label_prefix'))
check('merging away an original bullet\'s content is soft "dropped_fact"', codes(gate(null, ['Tracked 300 monthly work orders in the CMMS for HVAC plant', 'Supported shutdown works with the operations team']), 'soft').includes('dropped_fact'))
check('a summary that drops a term the original summary stated is soft lost_keyword',
  codes(checkQuality({ profile, plan: buildTailoringPlan(profile, ev, 'job_description', 'moderate'), evidence: buildEvidenceMap({ ...profile, professional_summary: 'Maintenance engineer with 8+ years in HVAC and facilities maintenance across hospitals.' } as CareerProfileFull, target, bridges), level: 'moderate', summary: 'Maintenance engineer with 8+ years in facilities maintenance across hospitals and malls, covering chiller plant upkeep and planned preventive maintenance with monthly work orders.', blocks: [] }), 'soft').includes('lost_keyword'))
{
  const eduTarget = { ...target, keywords: [{ term: "Bachelor's in Accounting", aliases: [], importance: 'must' as const, kind: 'education' as const }] }
  const eduProfile = { ...profile, education: [{ id: 'd1', profile_id: 'p1', degree: 'B.Com', field_of_study: 'Accounting', institution: 'Mumbai University', start_year: 2015, end_year: 2018, sort_order: 0 }] } as unknown as CareerProfileFull
  check('"B.Com Accounting" satisfies "Bachelor\'s in Accounting" (evidence)', buildEvidenceMap(eduProfile, eduTarget, []).keywords[0].status !== 'gap')
  check('"B.Com Accounting" earns full education credit (score)', scoreResume(scoreDocumentFromResume(baselineDocument(eduProfile, 'Accountant')), eduTarget, null).keywords[0].credit === 1)
}
check('an objective statement in the summary is hard (and removable)', codes(gate('Accounting graduate with audit internship experience in vouching and ledger scrutiny using Excel and Tally. Seeking to apply accounting knowledge in a junior accountant role.', []), 'hard').includes('objective_statement'))
check('easy keeps bullet count', codes(gate(null, ['Scheduled preventive maintenance for 120 chillers and AHUs'], 'e1', 'easy'), 'soft').includes('bullet_count_changed'))
check('clean block has no hard issue', codes(gate(null, ['Scheduled planned preventive maintenance for 120 HVAC chillers and AHUs', 'Tracked 300 monthly work orders in the CMMS', 'Supported shutdown works with the operations team']), 'hard').length === 0)

section('5b. Autofix only removes')
check('prunes the one sentence carrying an unsupported grade',
  pruneSummary('Software engineer who built React and TypeScript screens and Node.js REST APIs backed by PostgreSQL. Wrote unit tests with Jest for the driver onboarding service at Careem. Proficient in Git for version control.', ['proficient']) ===
    'Software engineer who built React and TypeScript screens and Node.js REST APIs backed by PostgreSQL. Wrote unit tests with Jest for the driver onboarding service at Careem.')
check('refuses to prune a summary down to almost nothing', pruneSummary('Engineer with HVAC work. Proficient in AutoCAD.', ['proficient']) === null)
check('cuts an unstated-outcome tail', cutOutcomeTail('Tracked 300 work orders in the CMMS, ensuring accuracy and compliance.', 'ensuring') === 'Tracked 300 work orders in the CMMS.')
check('leaves a bullet alone when the tail is not found', cutOutcomeTail('Tracked 300 work orders in the CMMS.', 'ensuring') === null)

section('6b. Validator: recombined profile words are not imports')
{
  const nurseLike = { ...makeProfile(), professional_summary: 'Registered nurse with 7 years in critical care.', work_experience: [{ ...makeProfile().work_experience[0], role: 'Staff Nurse - ICU' }], education: [{ id: 'd1', profile_id: 'p1', degree: 'B.Sc', field_of_study: 'Nursing', institution: 'Kerala University', start_year: 2012, end_year: 2016, sort_order: 0 }] } as unknown as CareerProfileFull
  const out = { summary: { generated: 'ICU Registered Nurse with 7 years in critical care. Holds a Bachelor of Science in Nursing.' }, experience_blocks: [], skills_order: ['s1', 's2'] }
  const v = validateGrounding(nurseLike, out, out.skills_order, { jobDescription: 'ICU Registered Nurse. Bachelor of Science in Nursing required. SCFHS licence.' })
  check('"ICU Registered Nurse" and "Bachelor of Science in Nursing" from the candidate\'s own words pass', v.valid)
  const out2 = { ...out, summary: { generated: 'ICU Registered Nurse with 7 years in critical care and an SCFHS licence.' } }
  check('a JD-only licence in the same summary still fails', !validateGrounding(nurseLike, out2, out2.skills_order, { jobDescription: 'SCFHS licence required.' }).valid)
}

// ---- 6. Validator allow-list --------------------------------------------------
section('6. Grounding validator allow-list')
const out = {
  summary: { generated: '' },
  experience_blocks: [{ profile_experience_id: 'e1', was_optimized: true, generated_bullets: ['Tracked 300 work orders monthly in the CMMS'] }],
  skills_order: ['s1', 's2'],
}
const without = validateGrounding(profile, out, out.skills_order, { jobDescription: JD })
check('without approval, a JD-only acronym is a hard import', without.failures.some((f) => f.code === 'jd_only_entity' && f.severity === 'hard'))
const withApproval = validateGrounding(profile, out, out.skills_order, { jobDescription: JD, approvedTerms: ev.approvedTerms })
check('with a verified bridge, the same bullet passes', withApproval.valid)
const leak = { ...out, experience_blocks: [{ profile_experience_id: 'e2', was_optimized: true, generated_bullets: ['Tracked work orders in the CMMS'] }] }
check('approval is per role: another role still fails', !validateGrounding(profile, leak, leak.skills_order, { jobDescription: JD, approvedTerms: ev.approvedTerms }).valid)

// ---- 7. Review parsing --------------------------------------------------------
section('6c. Section output shapes models actually return')
{
  const n = normalizeSectionOutput({ summary: { generated: '' }, experience_blocks: [{ profile_experience_id: 'e1', bullets: ['A b c d e f'] }], skills_order: [] }, ['e1']) as any
  check('"bullets" is read as generated_bullets, and was_optimized defaults true for the section roles', n.experience_blocks[0].generated_bullets[0] === 'A b c d e f' && n.experience_blocks[0].was_optimized === true && n.experience_blocks[0].bullets === undefined)
  const other = normalizeSectionOutput({ experience_blocks: [{ profile_experience_id: 'e2', bullets: ['x'] }] }, ['e1']) as any
  check('a block for a role outside the section is dropped, not a structural failure', other.experience_blocks.length === 0)
  const ids = ['17dfd11d-f4d5-4289-b4a2-b6ef115f7fbf', 'd6ab8ddb-7853-46ce-b0ac-0767cd123afc']
  const near = normalizeSectionOutput({ experience_blocks: [{ profile_experience_id: '17DFD11D-F4D5-4289-B4A2', generated_bullets: ['x y z a b'] }, { profile_experience_id: '17dfd11d-f4d5-4289-b4a2-b6ef115f7fbf', generated_bullets: ['dup'] }] }, ids) as any
  check('a truncated or re-cased id resolves to the section role, duplicates dropped', near.experience_blocks.length === 1 && near.experience_blocks[0].profile_experience_id === ids[0])
}

section('6d. Suggestion drafts are validated before they are shown')
{
  const reqs = suggestionRequirements(ev.keywords, 'high')
  const ok = (text: string, requirement = 'SAP PM', forId = 'e1') => validateSuggestions([{ for: forId, requirement, text }], { profile, requirements: reqs, roleIds: ['e1', 'e2', 'e3'] }).length === 1
  check('a plain draft for a real gap is kept', ok('Raised and closed maintenance work orders in SAP PM for the chiller plant'))
  check('a draft with a number is dropped (the candidate supplies their own)', !ok('Raised 300 maintenance work orders in SAP PM for the chiller plant'))
  check('a draft naming an employer the profile never mentions is dropped', !ok('Raised maintenance work orders in SAP PM for Emirates Global Aluminium plants'))
  check('a draft with a grading word is dropped', !ok('Successfully raised maintenance work orders in SAP PM for the plant'))
  check('a draft with "strong" is dropped', !ok('Raised work orders in SAP PM with a strong foundation in maintenance planning'))
  check('a draft for an unknown role is dropped', !ok('Raised maintenance work orders in SAP PM for the chiller plant', 'SAP PM', 'zz'))
  check('easy has no suggestion requirements', suggestionRequirements(ev.keywords, 'easy').length === 0)
  const doc = baselineDocument(profile, target.job_title)
  const applied = applySuggestionsToDocument(doc, [{ id: 'x', block: 'e1', requirement: 'SAP PM', text: 'Raised work orders in SAP PM', status: 'confirmed' }])
  check('a confirmed suggestion is appended to its role', applied.experience.find((e) => e.entry.id === 'e1')!.bullets.at(-1) === 'Raised work orders in SAP PM')
}

section('7. Review findings must quote the rewrite')
const blocks = [{ block: 'e1', rewrite: ['Delivered shutdown works for the hospital'], approvedTerms: [] }]
check('verbatim quote kept', parseReview({ issues: [{ block: 'e1', quote: 'Delivered shutdown works', reason: 'x' }] }, blocks).length === 1)
check('invented quote dropped', parseReview({ issues: [{ block: 'e1', quote: 'Led the shutdown', reason: 'x' }] }, blocks).length === 0)
check('unknown block dropped', parseReview({ issues: [{ block: 'zz', quote: 'Delivered shutdown works', reason: 'x' }] }, blocks).length === 0)

// ---- 8. Pipeline with a scripted model -----------------------------------------
section('8. Pipeline')

type Script = {
  summary?: (attempt: number) => string
  role?: (id: string, attempt: number) => string[] | null
  review?: (call: number, user: string) => Array<{ block: string; quote: string; reason: string }>
  structuralFailure?: boolean
  /** Return roles under "bullets" with no was_optimized, as the live model did. */
  bulletsKey?: boolean
}

function fakeModel(script: Script) {
  const attempts = new Map<string, number>()
  let reviews = 0
  const calls: GenerateCall[] = []
  const fn = async (call: GenerateCall) => {
    calls.push(call)
    if (call.configKey === 'optimization_review') {
      return { text: JSON.stringify({ issues: script.review ? script.review(reviews++, call.user) : [] }), truncated: false }
    }
    if (script.structuralFailure) return { text: 'not json at all', truncated: false }
    if (script.bulletsKey) {
      const ids = [...call.user.matchAll(/ROLE \[id: (\w+)\]/g)].map((m) => m[1])
      return { text: JSON.stringify({ summary: { generated: call.user.includes('PROFESSIONAL SUMMARY:') ? GOOD_SUMMARY : '' }, experience_blocks: ids.map((id) => ({ profile_experience_id: id, bullets: GOOD[id] })), skills_order: ['s2', 's1'] }), truncated: false }
    }
    const ids = [...call.user.matchAll(/ROLE \[id: (\w+)\]/g)].map((m) => m[1])
    const wantsSummary = call.user.includes('PROFESSIONAL SUMMARY:')
    const blocksOut = ids.map((id) => {
      const n = (attempts.get(id) ?? 0) + 1
      attempts.set(id, n)
      const bullets = script.role ? script.role(id, n) : null
      return bullets ? { profile_experience_id: id, was_optimized: true, generated_bullets: bullets } : null
    }).filter(Boolean)
    let summary = ''
    if (wantsSummary) {
      const n = (attempts.get('summary') ?? 0) + 1
      attempts.set('summary', n)
      summary = script.summary ? script.summary(n) : ''
    }
    return {
      text: JSON.stringify({
        mode: 'job_description',
        summary: { generated: summary },
        experience_blocks: blocksOut,
        skills_order: ['s2', 's1'],
        ...(call.user.includes('BLOCK 4C')
          ? {
              suggestions: [
                { for: 'e1', requirement: 'SAP PM', text: 'Raised and closed maintenance work orders in SAP PM for the chiller plant' },
                { for: 'summary', requirement: 'NEBOSH', text: 'Holds the NEBOSH International General Certificate' },
                { for: 'e1', requirement: 'CMMS', text: 'This is not a gap and must be dropped from suggestions' },
                { for: 'e2', requirement: 'SAP PM', text: 'Duplicate requirement is dropped' },
              ],
            }
          : {}),
      }),
      truncated: false,
    }
  }
  return { fn, calls }
}

const GOOD_SUMMARY =
  'Maintenance engineer with 8+ years in facilities maintenance across hospitals and malls. Covers HVAC and chiller plant upkeep through planned preventive maintenance, with monthly work orders tracked in a CMMS. Holds OSHA 30 and a B.E. in Mechanical Engineering, with AutoCAD skills.'
const GOOD: Record<string, string[]> = {
  e1: ['Scheduled planned preventive maintenance for 120 HVAC chillers and AHUs', 'Tracked 300 monthly work orders in the CMMS', 'Supported shutdown works with the operations team'],
  e2: ['Repaired electrical panels and lighting systems', 'Maintained fire alarm systems to keep the mall compliant'],
  e3: ['Served customers at the store counter daily', 'Handled the cash desk for the store', 'Arranged stock displays on the shop floor', 'Opened the store each morning shift'],
}

async function run(script: Script, level: 'easy' | 'moderate' | 'high' = 'moderate', giveUpMs = 280_000) {
  const model = fakeModel(script)
  const result = await runOptimizationPipeline({
    profile,
    target: { target_job_title: target.job_title, target_industry: null, target_country: null, target_company: null },
    level,
    selectedBlocks: { summary: true, experienceIds: ['e1', 'e2', 'e3'] },
    jobDescription: JD,
    targetProfile: target,
    bridges,
    analysisId: 'a1',
    userId: 'u1',
    giveUpAt: Date.now() + giveUpMs,
    generateFn: model.fn,
  })
  return { result, calls: model.calls }
}

async function pipelineSuite() {
  {
    const { result, calls } = await run({ summary: () => GOOD_SUMMARY, role: (id) => GOOD[id] })
    check('happy path succeeds', result.ok)
    if (result.ok) {
      check('fewer calls: summary and all roles are written in ONE build call', result.stats.sections === 1)
      check('fewer calls: a clean build makes exactly one model call (no review by default)', result.stats.modelCalls === 1)
      check('every block optimized', result.optimizedContent.experience_blocks.every((b) => b.was_optimized))
      check('summary is the generated one', result.optimizedContent.summary.generated === GOOD_SUMMARY)
      check('report after >= before', !!result.report?.after && result.report.after.total >= result.report.before.total)
      check('report lists gaps, never as matched', !!result.report?.gaps?.some((g) => g.term === 'SAP PM'))
      check('why_fits cites real placements', !!result.report?.why_fits?.some((w) => w.term === 'CMMS' && w.where.includes('e1')))
      check('the separate review call is off by default', !result.stats.reviewRan)
      check('skills order saved as ids', result.skillsOrder.join(',') === 's2,s1')
      check('snapshot carries the target title', result.documentSnapshot.header.targetJobTitle === target.job_title)
      check('no repair needed on clean output', !calls.some((c) => c.user.includes('CORRECTION REQUIRED')))
    }
  }
  {
    const { result, calls } = await run({
      summary: () => GOOD_SUMMARY,
      role: (id, n) => (id === 'e2' && n === 1 ? ['Repaired 950 electrical panels and lighting', 'Maintained fire alarm systems'] : GOOD[id]),
    })
    check('invented number triggers a targeted repair', calls.some((c) => c.user.includes('CORRECTION REQUIRED') && c.user.includes('ROLE [id: e2]') && !c.user.includes('ROLE [id: e1]')))
    check('repaired block ships', result.ok && result.optimizedContent.experience_blocks.find((b) => b.profile_experience_id === 'e2')!.was_optimized)
  }
  {
    process.env.OPTIMIZER_REVIEW = 'on'
    const { result } = await run({
      summary: () => GOOD_SUMMARY,
      role: (id) => GOOD[id],
      review: () => [{ block: 'e1', quote: 'Supported shutdown works', reason: 'always flagged' }],
    })
    const e1 = result.ok ? result.optimizedContent.experience_blocks.find((b) => b.profile_experience_id === 'e1') : null
    check('a block the review keeps flagging keeps the original text', !!e1 && !e1.was_optimized && (e1.generated_bullets ?? []).join('|') === (profile.work_experience[0].highlights ?? []).join('|'))
    check('kept_original records the review reason', result.ok && !!result.report?.kept_original?.some((k) => k.block === 'e1' && k.reason === 'review'))
    delete process.env.OPTIMIZER_REVIEW
  }
  {
    const { result, calls } = await run({ summary: () => GOOD_SUMMARY, role: (id) => GOOD[id] }, 'moderate')
    const s = result.ok ? result.report?.suggestions ?? [] : []
    check('moderate drafts must-have gaps first, then nice-to-haves (lines + a Skills entry)', calls[0].user.includes('BLOCK 4C') && calls[0].user.indexOf('- SAP PM') < calls[0].user.indexOf('- NEBOSH') && [...new Set(s.map((x) => x.requirement))].sort().join() === 'NEBOSH,SAP PM' && s.some((x) => x.block === 'skills' && x.text === 'SAP PM') && s.some((x) => x.block === 'e1'))
    check('suggestions are never merged into the CV', result.ok && !JSON.stringify(result.optimizedContent).includes('SAP PM'))
    check('score with suggestions confirmed is projected above the current score', result.ok && (result.report?.projected_with_suggestions ?? 0) > (result.report?.after?.total ?? 0))
    check('the level target band is recorded', result.ok && JSON.stringify(result.report?.target_band) === '[75,85]')
  }
  {
    const { result } = await run({ summary: () => GOOD_SUMMARY, role: (id) => GOOD[id] }, 'high')
    const s = result.ok ? result.report?.suggestions ?? [] : []
    check('high drafts for every gap (must and nice)', [...new Set(s.map((x) => x.requirement))].sort().join() === 'NEBOSH,SAP PM')
  }
  {
    const { calls } = await run({ summary: () => GOOD_SUMMARY, role: (id) => GOOD[id] }, 'easy')
    check('easy never asks for suggestions', !calls.some((c) => c.user.includes('BLOCK 4C')))
  }
  {
    // A section whose provider call fails once is retried, not dropped.
    let failedOnce = false
    const model = fakeModel({ summary: () => GOOD_SUMMARY, role: (id) => GOOD[id] })
    const flaky = async (call: GenerateCall) => {
      if (!failedOnce && call.user.includes('ROLE [id: e1]') && !call.user.includes('CORRECTION')) {
        failedOnce = true
        throw new Error('no answer within 90s — the upstream stalled')
      }
      return model.fn(call)
    }
    const result = await runOptimizationPipeline({
      profile, target: { target_job_title: target.job_title, target_industry: null, target_country: null, target_company: null },
      level: 'moderate', selectedBlocks: { summary: true, experienceIds: ['e1', 'e2', 'e3'] }, jobDescription: JD,
      targetProfile: target, bridges, analysisId: 'a1', userId: 'u1', giveUpAt: Date.now() + 280_000, generateFn: flaky,
    })
    check('a stalled section is retried and its roles still get rewritten', failedOnce && result.ok && result.optimizedContent.experience_blocks.every((b) => b.was_optimized))
  }
  {
    const { result } = await run({ bulletsKey: true })
    check('live shape ("bullets", no was_optimized): every role is still rewritten', result.ok && result.optimizedContent.experience_blocks.every((b) => b.was_optimized))
  }
  {
    const { result } = await run({ structuralFailure: true })
    check('all sections structurally broken -> error, nothing saved', !result.ok && result.status === 502)
  }
  {
    // Output that strips every employer term the original had -> score would drop.
    const { result } = await run({
      summary: () => 'Engineer with 8+ years of work in buildings across hospitals and malls, known for careful and reliable delivery on every assignment given.',
      role: (id) => (id === 'e1' ? ['Handled equipment upkeep tasks for the site', 'Logged monthly jobs for the site team', 'Supported shutdown works with the operations team'] : GOOD[id]),
    })
    check('score guard: the match score never goes down', result.ok && !!result.report?.after && result.report.after.total >= result.report.before.total)
  }
  {
    const { result, calls } = await run({
      summary: () => GOOD_SUMMARY + ' Proficient in AutoCAD drawings for HVAC layouts.',
      role: (id) => GOOD[id],
    })
    check('autofix: a summary with one unsupported grade ships without that sentence, with no model repair',
      result.ok && result.optimizedContent.summary.generated === GOOD_SUMMARY && !calls.some((c) => c.user.includes('CORRECTION REQUIRED')))
  }
  {
    const { result, calls } = await run({ summary: () => GOOD_SUMMARY, role: (id) => GOOD[id] }, 'moderate', 30_000)
    check('with little time left, no review or repair is started', result.ok && !calls.some((c) => c.configKey === 'optimization_review'))
  }
}

async function resultsSuite() {
  // 2026-09-17 founder report: empty summary and no ATS score after optimizing.
  {
    const noOwn = { ...profile, professional_summary: null } as CareerProfileFull
    const model = fakeModel({ summary: () => '', role: (id) => GOOD[id] })
    const result = await runOptimizationPipeline({
      profile: noOwn,
      target: { target_job_title: target.job_title, target_industry: null, target_country: null, target_company: null },
      level: 'moderate',
      selectedBlocks: { summary: true, experienceIds: ['e1', 'e2', 'e3'] },
      jobDescription: JD,
      targetProfile: target,
      bridges,
      analysisId: 'a1',
      userId: 'u1',
      giveUpAt: Date.now() + 280_000,
      generateFn: model.fn,
    })
    const summary = result.ok ? result.documentSnapshot.summary : ''
    check('no AI summary + no own summary: the CV still has a summary', result.ok && summary.trim().length > 40)
    check('fact summary names the latest role', summary.includes('Maintenance Engineer'))
    check('fact summary names a requirement the profile proves', /CMMS|HVAC|preventive maintenance/i.test(summary))
    check('fact summary never names a gap requirement', !/SAP PM|NEBOSH/.test(summary))
    check('the ATS score is still produced', result.ok && !!result.report?.after)
  }
  check('factSummary is empty only for an empty profile', factSummary({ ...profile, work_experience: [], skills: [] } as CareerProfileFull) === '')
  {
    // Analysis fallback: the combined call runs out of tokens -> a requirements-only call.
    const calls: GenerateCall[] = []
    const answer = JSON.stringify({ job_title: target.job_title, keywords: target.keywords, structured: target.structured })
    const res = await analyzeTargetWithEvidence({
      generateFn: async (call) => {
        calls.push(call)
        return calls.length === 1 ? { text: '{"job_title":', truncated: true } : { text: answer, truncated: false }
      },
      userId: 'u1',
      route: '/test',
      targetJobTitle: target.job_title,
      targetIndustry: null,
      jobDescription: JD,
      profile,
      giveUpAt: Date.now() + 280_000,
    })
    check('analysis: a truncated combined answer falls back to requirements only', calls.length === 2 && res !== null)
    check('analysis: the fallback call carries no profile evidence task', calls.length === 2 && !calls[1].system.includes('SECOND TASK') && calls[0].system.includes('SECOND TASK'))
    check('analysis: the fallback gives no model bridges', res !== null && res.bridges.length === 0)
    const r = await analyzeTargetWithEvidence({
      generateFn: async (call) => { calls.push(call); return { text: answer, truncated: false } },
      userId: 'u1', route: '/test', targetJobTitle: target.job_title, targetIndustry: null, jobDescription: JD, profile,
      giveUpAt: Date.now() + 90_000, requirementsOnly: true,
    })
    check('analysis: requirementsOnly skips the heavy call', r !== null && !calls[calls.length - 1].system.includes('SECOND TASK'))
  }
  {
    // Review page (2026-09-17): missing job skills/tools offered for the Skills section.
    const ev = buildEvidenceMap(profile, target, bridges)
    const skillSugs = skillSuggestions(suggestionRequirements(ev.keywords, 'high'))
    check('skill suggestions: only missing skills/tools, placed in skills', skillSugs.length > 0 && skillSugs.every((x) => x.block === 'skills') && skillSugs.some((x) => x.text === 'SAP PM') && !skillSugs.some((x) => x.text === 'NEBOSH'))
    const doc0 = baselineDocument(profile, target.job_title)
    const withSkills = applySuggestionsToDocument(doc0, skillSugs.map((x) => ({ ...x, status: 'confirmed' as const })))
    check('confirmed skill suggestion is added to the CV skills once', withSkills.skills.filter((k) => k.name === 'SAP PM').length === 1)
    const twice = applySuggestionsToDocument(withSkills, skillSugs)
    check('a skill already on the CV is not added again', twice.skills.length === withSkills.skills.length)
    check('easy offers no suggestions', suggestionRequirements(ev.keywords, 'easy').length === 0)
  }
  {
    const doc = baselineDocument(profile, target.job_title)
    const rep = reportForSavedDocument({ profile, target, bridges, analysisId: 'a1', targetJobTitle: target.job_title, level: 'high', document: doc })
    check('saved-CV score: before and after present, same doc scores equal', !!rep.after && rep.after.total === rep.before.total && rep.target_band?.[0] === 85)
  }
}

pipelineSuite()
  .then(resultsSuite)
  .then(() => {
    console.log(failures === 0 ? '\nALL OPTIMIZER ENGINE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
    process.exit(failures === 0 ? 0 : 1)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
