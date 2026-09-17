/**
 * Live optimizer evaluation (2026-09-17). SPENDS REAL AI CALLS — not in npm test.
 *
 *   node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/eval-optimizer-live.ts [level] [case-name ...]
 *
 * Runs the whole engine — analysis, evidence bridge, section generation, gate,
 * review, repair, score guard — with the AI provider configured in /admin, over
 * synthetic profiles from several professions (scripts/fixtures/optimizerEvalCases.ts).
 *
 * For each case it re-checks the FINAL output independently (grounding validator,
 * quality gate hard issues, gap terms, score direction) and writes the full
 * before/after text to tmp/optimizer-eval/<case>-<level>.md for a human read.
 * Exit code is non-zero when any automatic check fails.
 */

import './resolve-paths'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generate } from '../lib/ai/provider'
import { analyzeTargetWithEvidence } from '../lib/optimizer/analyze'
import { runOptimizationPipeline } from '../lib/optimizer/pipeline'
import { buildEvidenceMap } from '../lib/optimizer/evidence'
import { buildTailoringPlan } from '../lib/optimizer/plan'
import { checkQuality } from '../lib/optimizer/qualityGate'
import { containsTermRaw } from '../lib/optimizer/text'
import { validateGrounding } from '../lib/ai/validateGrounding'
import type { OptimizationLevel } from '../types/package'
import { EVAL_CASES, type EvalCase } from './fixtures/optimizerEvalCases'

const LEVELS: OptimizationLevel[] = ['easy', 'moderate', 'high']
const argLevel = LEVELS.includes(process.argv[2] as OptimizationLevel) ? (process.argv[2] as OptimizationLevel) : 'moderate'
const only = process.argv.slice(LEVELS.includes(process.argv[2] as OptimizationLevel) ? 3 : 2)
const cases = only.length ? EVAL_CASES.filter((c) => only.includes(c.name)) : EVAL_CASES
const OUT = join(process.cwd(), 'tmp', 'optimizer-eval')
mkdirSync(OUT, { recursive: true })

interface Outcome {
  name: string
  ok: boolean
  seconds: number
  before?: number
  after?: number
  max?: number
  calls?: number
  fellBack?: number
  projected?: number
  problems: string[]
}

async function runCase(c: EvalCase, level: OptimizationLevel): Promise<Outcome> {
  const started = Date.now()
  const problems: string[] = []
  const giveUpAt = Date.now() + 280_000
  const analysed = await analyzeTargetWithEvidence({
    generateFn: generate,
    userId: 'eval',
    route: 'eval',
    targetJobTitle: c.targetJobTitle,
    targetIndustry: null,
    jobDescription: c.jobDescription,
    profile: c.profile,
  })
  if (!analysed) return { name: c.name, ok: false, seconds: 0, problems: ['analysis failed'] }
  const { target, bridges } = analysed

  const allIds = c.profile.work_experience.map((e) => e.id)
  const traceLines: string[] = []
  const result = await runOptimizationPipeline({
    profile: c.profile,
    target: { target_job_title: c.targetJobTitle, target_industry: null, target_country: null, target_company: null },
    level,
    selectedBlocks: { summary: true, experienceIds: allIds },
    jobDescription: c.jobDescription,
    targetProfile: target,
    bridges,
    analysisId: null,
    userId: 'eval',
    giveUpAt,
    generateFn: generate,
    onTrace: (t) => {
      traceLines.push(`### ${t.phase} · ${t.owner}`, '', t.text || '(no output)', '')
      if (t.hard.length) traceLines.push(...t.hard.map((h) => `- HARD ${h}`))
      if (t.soft.length) traceLines.push(...t.soft.map((h) => `- soft ${h}`))
      traceLines.push('')
    },
  })
  const seconds = Math.round((Date.now() - started) / 1000)
  if (!result.ok) {
    writeFileSync(join(OUT, `${c.name}-${level}.md`), [`# ${c.name} — ${level}`, '', 'PIPELINE ERROR: ' + result.error, '', ...traceLines].join('\n'))
    return { name: c.name, ok: false, seconds, problems: ['pipeline error: ' + result.error] }
  }

  const oc = result.optimizedContent
  const report = result.report!
  const evidence = buildEvidenceMap(c.profile, target, bridges)

  // ---- Independent re-checks of what would be saved.
  const asOutput = {
    summary: { generated: oc.summary.generated },
    experience_blocks: oc.experience_blocks
      .filter((b) => b.was_optimized)
      .map((b) => ({ profile_experience_id: b.profile_experience_id, was_optimized: true, generated_bullets: b.generated_bullets })),
    skills_order: result.skillsOrder,
  }
  const importText = c.jobDescription ?? target.keywords.map((k) => [k.term, ...k.aliases].join(' ')).join('\n')
  const grounding = validateGrounding(c.profile, asOutput, result.skillsOrder, { jobDescription: importText, approvedTerms: evidence.approvedTerms })
  for (const f of grounding.failures.filter((x) => x.severity === 'hard')) problems.push(`grounding ${f.code} @ ${f.path}: "${f.offendingValue ?? ''}"`)
  const gate = checkQuality({
    profile: c.profile,
    plan: buildTailoringPlan(c.profile, evidence, target.mode, level),
    evidence,
    level,
    summary: oc.summary.generated || null,
    blocks: asOutput.experience_blocks.map((b) => ({ entryId: b.profile_experience_id, bullets: b.generated_bullets ?? [] })),
  })
  for (const i of gate.filter((x) => x.severity === 'hard')) problems.push(`quality ${i.code} @ ${i.owner}: "${i.offendingValue ?? ''}"`)
  const finalText = [oc.summary.generated, ...oc.experience_blocks.flatMap((b) => b.generated_bullets ?? [])].join('\n')
  for (const k of evidence.keywords.filter((x) => x.status === 'gap')) {
    if (containsTermRaw(finalText, k.term, k.aliases)) problems.push(`gap term written: ${k.term}`)
  }
  if (report.after && report.after.total < report.before.total) problems.push('score went down')

  // ---- Human-readable record.
  const lines: string[] = []
  lines.push(`# ${c.name} — ${level}`, '')
  lines.push(`Mode: ${target.mode} · Target: ${c.targetJobTitle} · ${seconds}s · calls ${result.stats.modelCalls} · repaired ${result.stats.repaired} · kept original ${result.stats.fellBack} · review ${result.stats.reviewRan}`)
  lines.push(`Score: before **${report.before.total}** → after **${report.after?.total}** (honest max ${report.max_total})`)
  lines.push(`Codes seen: ${[...new Set(result.stats.codes)].join(', ') || 'none'}`, '')
  lines.push('## Suggestions (shown to the user to confirm)', '')
  for (const s of report.suggestions ?? []) lines.push(`- [${s.requirement}] -> ${s.block === 'summary' ? 'summary' : s.block}: ${s.text}`)
  lines.push(`\nScore if all confirmed: ${report.projected_with_suggestions} · level aim ${JSON.stringify(report.target_band)}`, '')
  lines.push('## Requirements', '')
  for (const k of evidence.keywords) lines.push(`- [${k.status}] ${k.term} (${k.importance}, ${k.kind})${k.bridges.length ? ` ← "${k.bridges[0].quote}"` : ''}`)
  lines.push('', '## Summary', '', `**Before:** ${c.profile.professional_summary ?? '(none)'}`, '', `**After:** ${oc.summary.generated || '(kept original)'}`, '')
  for (const b of oc.experience_blocks) {
    const e = c.profile.work_experience.find((x) => x.id === b.profile_experience_id)!
    lines.push(`## ${e.role} — ${e.company}${b.was_optimized ? '' : ' (kept original)'}`, '', '**Before**')
    for (const h of e.highlights ?? []) lines.push(`- ${h}`)
    lines.push('', '**After**')
    for (const h of b.generated_bullets ?? []) lines.push(`- ${h}`)
    lines.push('')
  }
  lines.push('## Kept original', '', JSON.stringify(report.kept_original ?? []), '')
  lines.push('## Gaps', '', (report.gaps ?? []).map((g) => g.term).join(', ') || 'none', '')
  lines.push('## Automatic checks', '', problems.length ? problems.map((p) => `- ❌ ${p}`).join('\n') : '- ✅ all passed', '')
  lines.push('## Trace (every attempt)', '', ...traceLines)
  writeFileSync(join(OUT, `${c.name}-${level}.md`), lines.join('\n'))

  return {
    name: c.name,
    ok: problems.length === 0,
    seconds,
    before: report.before.total,
    after: report.after?.total,
    max: report.max_total,
    calls: result.stats.modelCalls,
    fellBack: result.stats.fellBack,
    projected: report.projected_with_suggestions,
    problems,
  }
}

async function main() {
  console.log(`Evaluating ${cases.length} case(s) at level "${argLevel}"…`)
  const outcomes: Outcome[] = []
  // Three at a time: realistic concurrency without tripping provider limits.
  for (let i = 0; i < cases.length; i += 3) {
    const batch = await Promise.all(
      cases.slice(i, i + 3).map((c) =>
        runCase(c, argLevel).catch((e): Outcome => ({ name: c.name, ok: false, seconds: 0, problems: ['crashed: ' + (e instanceof Error ? e.message : String(e))] })),
      ),
    )
    outcomes.push(...batch)
    for (const o of batch) {
      console.log(
        `${o.ok ? 'PASS' : 'FAIL'}  ${o.name.padEnd(16)} ${String(o.seconds).padStart(4)}s  ` +
          `score ${o.before ?? '-'} → ${o.after ?? '-'} (max ${o.max ?? '-'}, if suggestions confirmed ${o.projected ?? '-'})  calls ${o.calls ?? '-'}+1 analysis  kept ${o.fellBack ?? '-'}` +
          (o.problems.length ? `\n      ${o.problems.join('\n      ')}` : ''),
      )
    }
  }
  const failed = outcomes.filter((o) => !o.ok).length
  console.log(`\n${outcomes.length - failed}/${outcomes.length} cases passed. Details: tmp/optimizer-eval/`)
  process.exit(failed === 0 ? 0 : 1)
}

void main()
