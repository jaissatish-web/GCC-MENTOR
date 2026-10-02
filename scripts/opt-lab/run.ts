/**
 * Optimizer test lab — run and score (2026-10-02).
 *
 *   node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/opt-lab/run.ts v3 [filter]
 *   node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/opt-lab/run.ts baseline [filter]
 *   node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/opt-lab/run.ts report
 *
 * v3       the founder-approved prompts (lib/optimizer/v3) at Easy, Moderate, High
 * baseline today's production optimizer (runOptimizationPipeline) at Moderate
 * report   tables from the cached results, no model calls
 *
 * Every CV is scored two ways:
 *   ours  the production GCC Mentor match score (lib/optimizer/score.ts) against
 *         the v3 analysis' requirements
 *   ATS   an INDEPENDENT keyword check in the style of market tools (Jobscan-type
 *         match rate): its own prompt pulls keywords from the advert — it never
 *         sees our analysis — and counts which appear in the CV text
 * plus a separate recruiter judge on whether each added point is realistic.
 * Results are cached in tmp/opt-lab/; delete to re-run.
 */
import '../resolve-paths'
import fs from 'node:fs'
import path from 'node:path'
import { generate } from '../../lib/ai/provider'
import { extractJsonObject } from '../../lib/ai/extractionPrompt'
import { FAST_HOSTS } from '../../lib/resumeParse/pipeline'
import { scoreResume, type ScoreDocument } from '../../lib/optimizer/score'
import { containsTermRaw } from '../../lib/optimizer/text'
import { analyzeV3, writeV3, targetFromAnalysis, addableAt, type AnalysisV3, type WriteV3Result } from '../../lib/optimizer/v3/engine'
import type { CareerProfileFull } from '../../types/careerProfile'
import type { OptimizationLevel } from '../../types/package'
import { SCENARIOS } from './make-data'

const DATA = path.join(__dirname, 'data')
const OUT = path.resolve('tmp/opt-lab')
const mode = process.argv[2] ?? 'report'
const filter = process.argv[3]
const LEVELS: OptimizationLevel[] = ['easy', 'moderate', 'high']

const rawProfiles: Record<string, any> = JSON.parse(fs.readFileSync(path.join(DATA, 'profiles.json'), 'utf8'))
const jobs: Record<string, string> = JSON.parse(fs.readFileSync(path.join(DATA, 'jobs.json'), 'utf8'))

function toProfile(key: string): CareerProfileFull {
  const r = rawProfiles[key]
  const now = '2026-10-02T00:00:00Z'
  return {
    id: `p-${key}`, user_id: 'lab', full_name: r.full_name, professional_summary: r.professional_summary ?? null,
    phone: '+971 50 000 0000', email: 'lab@example.com', currently_in_gulf: true, target_job_title: null, target_industry: null,
    target_country: null, target_company: null, current_employer: null, current_project: null, photo_url: null, nationality: null,
    date_of_birth: null, passport_type: null, passport_validity_date: null, visa_status: null, visa_transferable: null, notice_period: null,
    current_location: null, whatsapp: null, linkedin_url: null, has_driving_license: null, driving_license_country: null,
    driving_license_category: null, driving_license_validity_date: null, field_visibility: {} as never, readiness_category: null,
    readiness_score: null, created_at: now, updated_at: now,
    work_experience: (r.work_experience ?? []).map((w: any, i: number) => ({
      id: `${key}-w${i + 1}`, profile_id: `p-${key}`, company: w.company, role: w.role, start_date: w.start_date ? `${w.start_date}-01` : '2020-01-01',
      end_date: w.end_date ? `${w.end_date}-01` : null, location: w.location ?? null, description: null, highlights: w.highlights ?? [], sort_order: i + 1,
      created_at: now, gcc_country: null,
    })),
    skills: (r.skills ?? []).map((s: string, i: number) => ({ id: `${key}-s${i}`, profile_id: `p-${key}`, name: s, sort_order: i + 1, created_at: now })),
    certifications: (r.certifications ?? []).map((c: any, i: number) => ({ id: `${key}-c${i}`, profile_id: `p-${key}`, name: c.name, issuer: c.issuer ?? null, issue_date: null, expiry_date: null, sort_order: i + 1, created_at: now })),
    education: (r.education ?? []).map((e: any, i: number) => ({ id: `${key}-e${i}`, profile_id: `p-${key}`, degree: e.degree, institution: e.institution ?? '', field_of_study: e.field_of_study ?? null, start_year: null, end_year: e.end_year ?? null, sort_order: i + 1, created_at: now })),
    additional_information: [],
  } as unknown as CareerProfileFull
}

// ---------------------------------------------------------------------------
// Documents and scores
// ---------------------------------------------------------------------------

function docFrom(profile: CareerProfileFull, title: string, summary: string, bullets: Map<string, string[]>): ScoreDocument {
  return {
    headline: title,
    summary,
    experience: profile.work_experience.map((e) => ({ entryId: e.id, role: e.role, bullets: bullets.get(e.id) ?? e.highlights ?? [] })),
    skills: profile.skills.map((s) => s.name),
    certifications: profile.certifications.map((c) => c.name),
    education: profile.education.map((e) => `${e.degree} ${e.field_of_study ?? ''} ${e.institution}`),
    additional: [],
    hasEmail: true,
    hasPhone: true,
  }
}
const beforeDoc = (p: CareerProfileFull, title: string) => docFrom(p, title, p.professional_summary ?? '', new Map())
const afterDoc = (p: CareerProfileFull, title: string, w: WriteV3Result) => docFrom(p, title, w.summary, new Map(w.jobs.map((j) => [j.id, j.bullets.map((b) => b.text)])))
const docText = (d: ScoreDocument) => [d.headline, d.summary, ...d.experience.flatMap((e) => [e.role, ...e.bullets]), ...d.skills, ...d.certifications, ...d.education].join('\n')

interface AtsKeywords { job_title: string; hard_skills: string[]; soft_skills: string[]; education: string[]; certifications: string[] }
const ATS_PROMPT = `You are the keyword parser of an applicant tracking system (the kind Jobscan, Taleo or Workday use). From the job advert, extract the keywords a recruiter would search CVs for.
Return ONLY JSON: { "job_title": "", "hard_skills": [], "soft_skills": [], "education": [], "certifications": [] }
Use the advert's exact wording, 1–3 words each. Up to 25 hard skills (technical skills, tools, methods, domain terms, core duties), up to 8 soft skills. Only what the advert says.`

async function atsKeywords(title: string): Promise<AtsKeywords> {
  const f = path.join(OUT, 'ats-keywords.json')
  const cache: Record<string, AtsKeywords> = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}
  if (cache[title]) return cache[title]
  const r = await generate({ system: ATS_PROMPT, user: jobs[title], maxTokens: 2000, temperature: 0, route: 'opt-lab/ats', configKey: 'default', openRouter: { reasoningOff: true, preferHosts: FAST_HOSTS } })
  const k = extractJsonObject(r.text) as AtsKeywords
  const fresh = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}
  fresh[title] = k
  fs.writeFileSync(f, JSON.stringify(fresh, null, 2))
  return k
}

/** Jobscan-style match rate: weighted share of the advert's keywords found in the CV text. */
function atsScore(k: AtsKeywords, doc: ScoreDocument): { pct: number; missingHard: string[] } {
  const text = docText(doc)
  let got = 0, total = 0
  const missingHard: string[] = []
  const add = (terms: string[] | undefined, w: number, track = false) => {
    for (const t of terms ?? []) {
      total += w
      if (containsTermRaw(text, t)) got += w
      else if (track) missingHard.push(t)
    }
  }
  add(k.hard_skills, 2, true)
  add(k.certifications, 2)
  add(k.education, 1)
  add(k.soft_skills, 1)
  if (k.job_title) { total += 2; if (containsTermRaw(text, k.job_title)) got += 2 }
  return { pct: total ? Math.round((100 * got) / total) : 0, missingHard }
}

const JUDGE_PROMPT = `You are an experienced Gulf recruiter. A CV tool added NEW POINTS to a candidate's CV — duties the candidate did not write but that the tool believes someone doing their real job almost certainly does.
For each new point, judge from the candidate's real experience: would this person really have done it?
"yes" = almost certainly true for someone in these roles; "likely" = probably true; "unlikely" = a stretch or a claim they may not be able to defend in an interview.
Return ONLY JSON: { "verdicts": [ { "point": "<the point>", "verdict": "yes" | "likely" | "unlikely", "why": "<6 words>" } ] }`

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

interface ScenarioResult {
  id: string; expect: string; jd: boolean; title: string; profile: string
  analysis: AnalysisV3
  levels: Record<string, WriteV3Result>
  judge?: Array<{ point: string; verdict: string; why: string }>
}

async function runV3(s: (typeof SCENARIOS)[number]): Promise<void> {
  const f = path.join(OUT, 'v3', `${s.id}.json`)
  if (fs.existsSync(f)) return
  const profile = toProfile(s.profile)
  const jd = s.jd ? jobs[s.title] : null
  const analysis = await analyzeV3(profile, s.title, jd)
  const written = await Promise.all(LEVELS.map((l) => writeV3(profile, s.title, jd, analysis, l).catch((e) => ({ error: String(e) }) as never)))
  const levels: Record<string, WriteV3Result> = Object.fromEntries(LEVELS.map((l, i) => [l, written[i]]))
  // Recruiter judge on every new point at High.
  let judge: ScenarioResult['judge']
  const newPts = (levels.high?.jobs ?? []).flatMap((j) => j.bullets.filter((b) => b.isNew).map((b) => ({ job: profile.work_experience.find((e) => e.id === j.id)!, text: b.text })))
  if (newPts.length) {
    const user = `CANDIDATE'S REAL EXPERIENCE:\n${profile.work_experience.map((e) => `${e.role} — ${e.company}\n${(e.highlights ?? []).map((h) => '  - ' + h).join('\n')}`).join('\n')}\n\nNEW POINTS:\n${newPts.map((p) => `- [${p.job.role} — ${p.job.company}] ${p.text}`).join('\n')}`
    const r = await generate({ system: JUDGE_PROMPT, user, maxTokens: 3000, temperature: 0, route: 'opt-lab/judge', configKey: 'default', openRouter: { reasoningOff: true, preferHosts: FAST_HOSTS } })
    judge = ((extractJsonObject(r.text) as { verdicts?: ScenarioResult['judge'] })?.verdicts) ?? []
  }
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, JSON.stringify({ ...s, analysis, levels, judge } satisfies ScenarioResult, null, 2))
  console.log(`  v3 ${s.id.padEnd(16)} analysis ${(analysis.ms / 1000).toFixed(1)}s · ${LEVELS.map((l) => `${l} ${levels[l]?.ms ? (levels[l].ms / 1000).toFixed(1) + 's' : 'ERR'}`).join(' · ')}`)
}

async function runBaseline(s: (typeof SCENARIOS)[number]): Promise<void> {
  const f = path.join(OUT, 'baseline', `${s.id}.json`)
  if (fs.existsSync(f)) return
  const { analyzeTargetWithEvidence } = await import('../../lib/optimizer/analyze')
  const { runOptimizationPipeline } = await import('../../lib/optimizer/pipeline')
  const profile = toProfile(s.profile)
  const jd = s.jd ? jobs[s.title] : null
  const t0 = Date.now()
  const giveUpAt = t0 + 280_000
  const analysed = await analyzeTargetWithEvidence({ generateFn: generate, userId: 'lab', route: 'opt-lab/baseline', targetJobTitle: s.title, targetIndustry: null, jobDescription: jd, profile, giveUpAt })
  const tAnalysis = Date.now() - t0
  let out: Record<string, unknown> = { id: s.id, analysisMs: tAnalysis, ok: false }
  if (analysed) {
    const r = await runOptimizationPipeline({
      profile, target: { target_job_title: s.title, target_industry: null, target_country: null, target_company: null }, level: 'moderate',
      selectedBlocks: { summary: true, experienceIds: profile.work_experience.map((e) => e.id) }, jobDescription: jd, targetProfile: analysed.target,
      bridges: analysed.bridges, analysisId: null, userId: 'lab', giveUpAt, generateFn: generate,
    })
    out = {
      id: s.id, analysisMs: tAnalysis, totalMs: Date.now() - t0, ok: r.ok,
      calls: r.stats.modelCalls, fellBack: r.stats.fellBack,
      summary: r.ok ? r.optimizedContent.summary.generated : null,
      blocks: r.ok ? r.optimizedContent.experience_blocks.map((b) => ({ id: b.profile_experience_id, bullets: b.generated_bullets, optimized: b.was_optimized })) : [],
      suggestions: r.ok ? r.report?.suggestions ?? [] : [],
      ownScore: r.ok ? { before: r.report?.before.total, after: r.report?.after?.total, withSuggestions: r.report?.projected_with_suggestions } : null,
      error: r.ok ? null : r.error,
    }
  }
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, JSON.stringify(out, null, 2))
  console.log(`  baseline ${s.id.padEnd(16)} ${((Date.now() - t0) / 1000).toFixed(0)}s ok=${out.ok}`)
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const it = items[i++]
      try { await fn(it) } catch (e) { console.error('  FAILED', (it as { id: string }).id, e instanceof Error ? e.message : e) }
    }
  }))
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

async function report() {
  const rows: string[] = []
  const md: string[] = ['# Optimizer test lab — results', '', `Run ${new Date().toISOString().slice(0, 16)} · ${SCENARIOS.length} scenarios`, '']
  let leakCount = 0
  const leakEx: string[] = []
  const agg = { field: 0, fieldN: 0, judge: { yes: 0, likely: 0, unlikely: 0 }, caught: 0, fellBack: 0, dropped: 0, newPts: 0, times: [] as number[] }
  const byExpect: Record<string, { ours: number[][]; ats: number[][] }> = {}
  md.push('| Scenario | Field (expected → found) | Our score: before → Easy / Moderate / High | Independent ATS: before → Easy / Moderate / High | New points (Mod / High) | Time: analysis + Moderate |', '|---|---|---|---|---|---|')
  for (const s of SCENARIOS) {
    const f = path.join(OUT, 'v3', `${s.id}.json`)
    if (!fs.existsSync(f)) continue
    const r: ScenarioResult = JSON.parse(fs.readFileSync(f, 'utf8'))
    const profile = toProfile(s.profile)
    const target = targetFromAnalysis(r.analysis, s.title, s.jd ? 'job_description' : 'target_title_only')
    // Qualifications as on the website (25% of the score): the share of the job's
    // fixed requirements (degree, years, certificates, licences) the profile meets.
    const fixed = r.analysis.requirements.filter((q) => ['education', 'experience_years', 'certification', 'licence'].includes(q.kind))
    const w = (q: { importance: string }) => (q.importance === 'must' ? 3 : 1)
    const quals = fixed.length ? (100 * fixed.filter((q) => q.group === 'A').reduce((n, q) => n + w(q), 0)) / fixed.reduce((n, q) => n + w(q), 0) : null
    const ours = (d: ScoreDocument) => scoreResume(d, target, quals).total
    const b = beforeDoc(profile, s.title)
    const oursRow = [ours(b), ...LEVELS.map((l) => (r.levels[l]?.jobs ? ours(afterDoc(profile, s.title, r.levels[l])) : NaN))]
    let atsRow = [NaN, NaN, NaN, NaN]
    if (s.jd) {
      const k = await atsKeywords(s.title)
      atsRow = [atsScore(k, b).pct, ...LEVELS.map((l) => (r.levels[l]?.jobs ? atsScore(k, afterDoc(profile, s.title, r.levels[l])).pct : NaN))]
    }
    ;(byExpect[`${s.expect}${s.jd ? '' : ' (title only)'}`] ??= { ours: [], ats: [] }).ours.push(oursRow)
    if (s.jd) byExpect[`${s.expect}`].ats.push(atsRow)
    agg.fieldN++
    if (r.analysis.fieldMatch === s.expect) agg.field++
    for (const v of r.judge ?? []) agg.judge[v.verdict as 'yes' | 'likely' | 'unlikely'] = (agg.judge[v.verdict as 'yes'] ?? 0) + 1
    // Independent audit of the FINAL CV: a C requirement (not shown, not addable)
    // written anywhere the original profile did not have it is an invented claim.
    const original = docText(b)
    for (const l of LEVELS) {
      const w0 = r.levels[l]
      if (!w0?.jobs) continue
      const finalText = docText(afterDoc(profile, s.title, w0))
      const addable = new Set(addableAt(r.analysis, l).map((q) => q.term))
      for (const q of r.analysis.requirements.filter((x) => x.group === 'C' || (x.group === 'B' && !addable.has(x.term)))) {
        if (containsTermRaw(finalText, q.term) && !containsTermRaw(original, q.term)) { leakCount++; if (leakEx.length < 12) leakEx.push(`${s.id} ${l}: ${q.term}`) }
      }
    }
    for (const l of LEVELS) {
      const w = r.levels[l]
      if (!w?.jobs) continue
      agg.caught += w.caught.length
      agg.fellBack += w.jobs.filter((j) => j.keptOriginal).length + (w.summaryKeptOriginal ? 1 : 0)
      agg.dropped += w.jobs.reduce((n, j) => n + j.droppedNew.length, 0)
      agg.newPts += w.jobs.reduce((n, j) => n + j.bullets.filter((x) => x.isNew).length, 0)
    }
    const total = r.analysis.ms + (r.levels.moderate?.ms ?? 0)
    agg.times.push(total)
    const np = (l: string) => r.levels[l]?.jobs?.reduce((n, j) => n + j.bullets.filter((x) => x.isNew).length, 0) ?? 0
    const fmt = (a: number[]) => `${a[0]} → ${a.slice(1).map((x) => (Number.isNaN(x) ? '—' : x)).join(' / ')}`
    md.push(`| ${s.id}${s.jd ? '' : ' (title only)'} | ${s.expect} → ${r.analysis.fieldMatch}${r.analysis.fieldMatch === s.expect ? ' ✓' : ' ✗'} | ${fmt(oursRow)} | ${s.jd ? fmt(atsRow) : 'n/a (no advert)'} | ${np('moderate')} / ${np('high')} | ${(r.analysis.ms / 1000).toFixed(0)}s + ${((r.levels.moderate?.ms ?? 0) / 1000).toFixed(0)}s |`)
    rows.push(`${s.id.padEnd(18)} ${s.expect.padEnd(9)}→${r.analysis.fieldMatch.padEnd(9)} ours ${fmt(oursRow).padEnd(22)} ats ${s.jd ? fmt(atsRow) : 'n/a'}`)
  }
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : NaN)
  md.push('', '## Averages by field match', '', '| Group | Our score: before → Easy / Moderate / High | Independent ATS: before → Easy / Moderate / High |', '|---|---|---|')
  for (const [g, v] of Object.entries(byExpect)) {
    const col = (m: number[][], i: number) => avg(m.map((r) => r[i]).filter((x) => !Number.isNaN(x)))
    const line = (m: number[][]) => (m.length ? `${col(m, 0)} → ${[1, 2, 3].map((i) => col(m, i)).join(' / ')}` : 'n/a')
    md.push(`| ${g} (${v.ours.length}) | ${line(v.ours)} | ${line(v.ats)} |`)
  }
  const t = agg.times.sort((a, b) => a - b)
  const j = agg.judge
  const jt = j.yes + j.likely + j.unlikely
  md.push('', '## Safety and speed', '',
    `- Field verdict right: ${agg.field}/${agg.fieldN}`,
    `- Invented-claim audit on the final CVs (C requirements written that the profile never had): ${leakCount}${leakEx.length ? ' — ' + leakEx.join('; ') : ''}`,
    `- Problems caught by the checks (fixed automatically): ${agg.caught} — jobs/summaries kept original: ${agg.fellBack}; new points dropped: ${agg.dropped}; new points kept: ${agg.newPts}`,
    `- Recruiter judge on High's new points: yes ${j.yes} · likely ${j.likely} · unlikely ${j.unlikely} (${jt ? Math.round((100 * (j.yes + j.likely)) / jt) : 0}% realistic)`,
    `- Time (analysis + Moderate write): median ${(t[Math.floor(t.length / 2)] / 1000).toFixed(0)}s, slowest ${(t[t.length - 1] / 1000).toFixed(0)}s`)
  fs.writeFileSync(path.join(OUT, 'report-v3.md'), md.join('\n'))
  console.log(rows.join('\n'))
  console.log(md.slice(md.indexOf('## Averages by field match')).join('\n'))
}

;(async () => {
  const only = process.env.OPT_LAB_IDS ? process.env.OPT_LAB_IDS.split(',') : null
  const list = SCENARIOS.filter((s) => (!filter || s.id.includes(filter)) && (!only || only.includes(s.id)))
  fs.mkdirSync(OUT, { recursive: true })
  if (mode === 'v3') await pool(list, 6, runV3)
  else if (mode === 'baseline') await pool(list, 4, runBaseline)
  if (mode !== 'baseline') await report()
})()
