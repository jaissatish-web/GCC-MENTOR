/**
 * Optimizer test lab — today's optimizer vs v3, same CVs, same three measures
 * (2026-10-02). Reads cached results only; no model calls except the ATS
 * keyword list, which run.ts already cached.
 *
 *   node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/opt-lab/compare.ts
 */
import '../resolve-paths'
import fs from 'node:fs'
import path from 'node:path'
import { scoreResume, type ScoreDocument } from '../../lib/optimizer/score'
import { containsTermRaw } from '../../lib/optimizer/text'
import { targetFromAnalysis, addableAt, type AnalysisV3 } from '../../lib/optimizer/v3/engine'
import { SCENARIOS } from './make-data'

const OUT = path.resolve('tmp/opt-lab')
const profiles = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'profiles.json'), 'utf8'))
const atsCache = JSON.parse(fs.readFileSync(path.join(OUT, 'ats-keywords.json'), 'utf8'))

function doc(key: string, title: string, summary: string, bullets: string[][]): ScoreDocument {
  const p = profiles[key]
  return {
    headline: title, summary,
    experience: p.work_experience.map((w: any, i: number) => ({ entryId: `${key}-w${i + 1}`, role: w.role, bullets: bullets[i] ?? w.highlights })),
    skills: p.skills, certifications: p.certifications.map((c: any) => c.name), education: p.education.map((e: any) => `${e.degree} ${e.field_of_study ?? ''} ${e.institution}`),
    additional: [], hasEmail: true, hasPhone: true,
  }
}
const text = (d: ScoreDocument) => [d.headline, d.summary, ...d.experience.flatMap((e) => [e.role, ...e.bullets]), ...d.skills, ...d.certifications, ...d.education].join('\n')
function ats(title: string, d: ScoreDocument): number | null {
  const k = atsCache[title]
  if (!k) return null
  const t = text(d)
  let got = 0, total = 0
  const add = (xs: string[] = [], w: number) => { for (const x of xs) { total += w; if (containsTermRaw(t, x)) got += w } }
  add(k.hard_skills, 2); add(k.certifications, 2); add(k.education, 1); add(k.soft_skills, 1)
  if (k.job_title) { total += 2; if (containsTermRaw(t, k.job_title)) got += 2 }
  return total ? Math.round((100 * got) / total) : null
}

const rows: string[] = ['| Scenario | Time: today → v3 | Our score: before → today / v3 | Independent ATS: before → today / v3 | Invented claims: today / v3 |', '|---|---|---|---|---|']
const sum = { tToday: [] as number[], tV3: [] as number[], oT: [] as number[], oV: [] as number[], aT: [] as number[], aV: [] as number[], aB: [] as number[], oB: [] as number[], invT: 0, invV: 0 }
for (const s of SCENARIOS) {
  const bf = path.join(OUT, 'baseline', `${s.id}.json`)
  const vf = path.join(OUT, 'v3', `${s.id}.json`)
  if (!fs.existsSync(bf) || !fs.existsSync(vf)) continue
  const base = JSON.parse(fs.readFileSync(bf, 'utf8'))
  const v3 = JSON.parse(fs.readFileSync(vf, 'utf8'))
  if (!base.ok) { rows.push(`| ${s.id} | today FAILED (${base.error ?? 'error'}) | | | |`); continue }
  const a: AnalysisV3 = v3.analysis
  const target = targetFromAnalysis(a, s.title, s.jd ? 'job_description' : 'target_title_only')
  const fixed = a.requirements.filter((q) => ['education', 'experience_years', 'certification', 'licence'].includes(q.kind))
  const w = (q: { importance: string }) => (q.importance === 'must' ? 3 : 1)
  const quals = fixed.length ? (100 * fixed.filter((q) => q.group === 'A').reduce((n, q) => n + w(q), 0)) / fixed.reduce((n, q) => n + w(q), 0) : null
  const p = profiles[s.profile]
  const before = doc(s.profile, s.title, p.professional_summary, [])
  const today = doc(s.profile, s.title, base.summary || p.professional_summary, p.work_experience.map((_: unknown, i: number) => {
    const b = base.blocks.find((x: any) => x.id === `${s.profile}-w${i + 1}`)
    return b?.optimized && b.bullets?.length ? b.bullets : p.work_experience[i].highlights
  }))
  const m = v3.levels.moderate
  const next = doc(s.profile, s.title, m.summary, m.jobs.map((j: any) => j.bullets.map((x: any) => x.text)))
  const sc = (d: ScoreDocument) => scoreResume(d, target, quals).total
  // Invented-claim audit: C requirements (and B not addable at Moderate) in the final CV that the profile never had.
  const addable = new Set(addableAt(a, 'moderate').map((q) => q.term))
  const cTerms = a.requirements.filter((q) => q.group === 'C' || (q.group === 'B' && !addable.has(q.term))).map((q) => q.term)
  const inv = (d: ScoreDocument) => cTerms.filter((t) => containsTermRaw(text(d), t) && !containsTermRaw(text(before), t))
  const invT = inv(today), invV = inv(next)
  sum.invT += invT.length; sum.invV += invV.length
  const tT = Math.round(base.totalMs / 1000), tV = Math.round((a.ms + m.ms) / 1000)
  sum.tToday.push(tT); sum.tV3.push(tV)
  const [ob, ot, ov] = [sc(before), sc(today), sc(next)]
  sum.oB.push(ob); sum.oT.push(ot); sum.oV.push(ov)
  const [ab, at, av] = [ats(s.title, before), ats(s.title, today), ats(s.title, next)]
  if (ab !== null) { sum.aB.push(ab); sum.aT.push(at!); sum.aV.push(av!) }
  rows.push(`| ${s.id} | ${tT}s → ${tV}s | ${ob} → ${ot} / **${ov}** | ${ab ?? 'n/a'} → ${at ?? 'n/a'} / **${av ?? 'n/a'}** | ${invT.length}${invT.length ? ' (' + invT.slice(0, 3).join(', ') + ')' : ''} / ${invV.length} |`)
}
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((x, y) => x + y, 0) / xs.length) : NaN)
rows.push(`| **Average** | **${avg(sum.tToday)}s → ${avg(sum.tV3)}s** | ${avg(sum.oB)} → ${avg(sum.oT)} / **${avg(sum.oV)}** | ${avg(sum.aB)} → ${avg(sum.aT)} / **${avg(sum.aV)}** | ${sum.invT} / ${sum.invV} |`)
const out = ['# Today\'s optimizer vs v3 (Moderate)', '', ...rows].join('\n')
fs.writeFileSync(path.join(OUT, 'compare.md'), out)
console.log(out)
