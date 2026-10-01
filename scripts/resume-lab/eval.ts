/**
 * Resume-parser evaluation — runs a parser over the generated test set and
 * scores every field (2026-10-01).
 *
 *   node scripts/resume-lab/generate-fixtures.mjs          # once: ~100 fake CVs
 *   node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/resume-lab/eval.ts <mode> [concurrency] [filter]
 *
 *   mode = baseline  the reader as it was before 2026-10-01 (plain text + one thinking call)
 *          v2        lib/resumeParse (layout-aware text + rules + fast call + checks)
 *          rescore   re-score cached results for every mode, no model calls
 *
 * Spends REAL model calls (about ₹0.1 per CV). Results are cached per CV in
 * tmp/parser-lab/results/<mode>/, so a re-run only reads what is missing —
 * delete the folder to read again.
 */
import './../resolve-paths'
import fs from 'node:fs'
import path from 'node:path'
import { scoreCv, type CvScore, type Truth } from './score'

const FIX = path.resolve('tmp/parser-lab/fixtures')
const RES = path.resolve('tmp/parser-lab/results')
const mode = process.argv[2] ?? 'rescore'
const concurrency = Number(process.argv[3] ?? 6)
const filter = process.argv[4]

interface Manifest { id: string; file: string; layout: string; format: string; fresher: boolean; expect: 'parsed' | 'rejected-scan'; dateStyle: string }
interface RunResult { id: string; ok: boolean; rejected?: string; error?: string; draft?: unknown; ms: number; inputTokens?: number; outputTokens?: number; notes?: unknown }

// --------------------------------------------------------------- parsers
async function baseline(file: string, format: string): Promise<Omit<RunResult, 'id' | 'ms'>> {
  const { generate } = await import('../../lib/ai/provider')
  const { EXTRACTION_MAX_TOKENS, EXTRACTION_SYSTEM_PROMPT, normalizeDraft, extractJsonObject } = await import('../../lib/ai/extractionPrompt')
  const buf = fs.readFileSync(file)
  let text = ''
  if (format === 'pdf') {
    const { extractPdfText } = await import('../../lib/pdfTextExtract')
    const pdf = await extractPdfText(buf)
    if (!pdf.text.trim() && (pdf.imageCount ?? 0) > 0) return { ok: false, rejected: 'PDF_SCANNED' }
    if (pdf.looksGarbled) return { ok: false, rejected: 'PDF_UNREADABLE' }
    text = pdf.text
  } else if (format === 'docx') {
    const mammoth = await import('mammoth')
    text = (await mammoth.extractRawText({ buffer: buf })).value
  } else text = buf.toString('utf8')
  const r = await generate({ system: EXTRACTION_SYSTEM_PROMPT, user: `Extract from this resume text:\n\n${text}`, maxTokens: EXTRACTION_MAX_TOKENS, temperature: 0.1, route: 'resume-lab/baseline', configKey: 'extraction' })
  if (r.truncated) return { ok: false, error: 'TRUNCATED', inputTokens: r.inputTokens, outputTokens: r.outputTokens }
  const draft = normalizeDraft(extractJsonObject(r.text))
  return { ok: !!draft, draft, inputTokens: r.inputTokens, outputTokens: r.outputTokens, error: draft ? undefined : 'UNPARSEABLE' }
}

async function v2(file: string, format: string): Promise<Omit<RunResult, 'id' | 'ms'>> {
  const { parseResume } = await import('../../lib/resumeParse/pipeline')
  const buf = fs.readFileSync(file)
  const input = format === 'txt' ? { kind: 'text' as const, text: buf.toString('utf8') } : { kind: format as 'pdf' | 'docx', buffer: buf }
  const r = await parseResume(input, { route: 'resume-lab/v2' })
  if (!r.ok) return { ok: false, rejected: r.code, error: r.code }
  return { ok: true, draft: r.draft, inputTokens: r.report.inputTokens, outputTokens: r.report.outputTokens, notes: r.report }
}

const PARSERS: Record<string, typeof baseline> = { baseline, v2 }
/** 'v2-run2', 'v2-after-fix' … : the v2 parser, results kept in their own folder to compare runs. */
const parserFor = (m: string) => PARSERS[m] ?? (m.startsWith('v2') ? v2 : undefined)

// --------------------------------------------------------------- run
async function runMode(m: string, items: Manifest[]) {
  const dir = path.join(RES, m)
  fs.mkdirSync(dir, { recursive: true })
  const todo = items.filter((it) => !fs.existsSync(path.join(dir, it.id + '.json')))
  console.log(`${m}: ${items.length - todo.length} cached, ${todo.length} to read (x${concurrency})`)
  let next = 0
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < todo.length) {
      const it = todo[next++]
      const t0 = Date.now()
      let r: RunResult
      try {
        r = { id: it.id, ...(await parserFor(m)!(path.join(FIX, it.file), it.format)), ms: Date.now() - t0 }
      } catch (e) {
        r = { id: it.id, ok: false, error: e instanceof Error ? e.message.slice(0, 300) : String(e), ms: Date.now() - t0 }
      }
      fs.writeFileSync(path.join(dir, it.id + '.json'), JSON.stringify(r, null, 2))
      console.log(`  ${it.id.padEnd(30)} ${(r.ms / 1000).toFixed(1)}s ${r.ok ? 'ok' : r.rejected ?? r.error}`)
    }
  }))
}

// --------------------------------------------------------------- report
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—')
function report(m: string, items: Manifest[]) {
  const dir = path.join(RES, m)
  const rows: { it: Manifest; r: RunResult; s: CvScore | null }[] = []
  for (const it of items) {
    const f = path.join(dir, it.id + '.json')
    if (!fs.existsSync(f)) continue
    const r: RunResult = JSON.parse(fs.readFileSync(f, 'utf8'))
    const truth: Truth = JSON.parse(fs.readFileSync(path.join(FIX, it.id + '.truth.json'), 'utf8'))
    rows.push({ it, r, s: it.expect === 'parsed' ? scoreCv(truth, r.ok ? (r.draft as Record<string, unknown>) : null) : null })
  }
  if (!rows.length) return
  const parsed = rows.filter((x) => x.it.expect === 'parsed')
  const scans = rows.filter((x) => x.it.expect === 'rejected-scan')
  const times = parsed.filter((x) => x.r.ok).map((x) => x.r.ms).sort((a, b) => a - b)
  const q = (p: number) => (times.length ? (times[Math.min(times.length - 1, Math.floor(p * times.length))] / 1000).toFixed(1) + 's' : '—')
  const sum = (fn: (s: CvScore) => number) => parsed.reduce((n, x) => n + (x.s ? fn(x.s) : 0), 0)
  const fieldNames = ['full_name', 'email', 'phone', 'nationality', 'date_of_birth', 'current_location', 'linkedin_url', 'passport_type', 'visa_status', 'notice_period']
  const out: string[] = []
  out.push(`\n================ ${m.toUpperCase()} — ${parsed.length} CVs (+${scans.length} scans) ================`)
  out.push(`read OK         ${pct(parsed.filter((x) => x.r.ok).length, parsed.length)}   failed: ${parsed.filter((x) => !x.r.ok).map((x) => x.it.id + '(' + (x.r.rejected ?? x.r.error) + ')').join(', ') || 'none'}`)
  out.push(`PERFECT CV      ${pct(parsed.filter((x) => x.s?.perfect).length, parsed.length)}   (every field right)`)
  out.push(`saveable        ${pct(parsed.filter((x) => x.s?.saveable).length, parsed.length)}   (profile save would accept it as-is)`)
  out.push(`time            median ${q(0.5)}  p90 ${q(0.9)}  max ${q(0.999)}`)
  const outTok = parsed.reduce((n, x) => n + (x.r.outputTokens ?? 0), 0), inTok = parsed.reduce((n, x) => n + (x.r.inputTokens ?? 0), 0)
  out.push(`tokens/CV       in ${Math.round(inTok / parsed.length)}  out ${Math.round(outTok / parsed.length)}`)
  out.push(`scans           ${scans.map((x) => x.r.rejected ?? (x.r.ok ? 'PARSED?!' : x.r.error)).join(', ')}`)
  out.push('-- fields')
  for (const fname of fieldNames) {
    const have = parsed.filter((x) => x.s && fname in x.s.fields)
    out.push(`  ${fname.padEnd(18)} ${pct(have.filter((x) => x.s!.fields[fname]).length, have.length).padStart(5)}  (n=${have.length})`)
  }
  out.push(`  invented values    ${sum((s) => s.invented.length)}`)
  const J = (k: keyof CvScore['jobs']) => sum((s) => s.jobs[k])
  out.push(`-- jobs (n=${J('total')})  found ${pct(J('found'), J('total'))}  extra ${J('extra')}  role ${pct(J('role'), J('total'))}  start ${pct(J('start'), J('total'))}  end ${pct(J('end'), J('total'))}  location ${pct(J('location'), J('total'))}`)
  out.push(`-- education       found ${pct(sum((s) => s.education.found), sum((s) => s.education.total))}  year ${pct(sum((s) => s.education.year), sum((s) => s.education.total))}`)
  out.push(`-- skills          found ${pct(sum((s) => s.skills.found), sum((s) => s.skills.total))}`)
  out.push(`-- certifications  found ${pct(sum((s) => s.certs.found), sum((s) => s.certs.total))}`)
  out.push('-- by layout                 perfect  jobs-found  dates-right  contact')
  const layouts = [...new Set(parsed.map((x) => `${x.it.layout}${x.it.fresher ? '-fresher' : ''}-${x.it.format}`))]
  for (const l of layouts) {
    const g = parsed.filter((x) => `${x.it.layout}${x.it.fresher ? '-fresher' : ''}-${x.it.format}` === l)
    const gs = (fn: (s: CvScore) => number) => g.reduce((n, x) => n + (x.s ? fn(x.s) : 0), 0)
    const contact = g.filter((x) => x.s?.fields.email && x.s?.fields.phone && x.s?.fields.full_name).length
    out.push(`  ${l.padEnd(26)} ${pct(g.filter((x) => x.s?.perfect).length, g.length).padStart(5)}    ${pct(gs((s) => s.jobs.found), gs((s) => s.jobs.total)).padStart(5)}      ${pct(gs((s) => s.jobs.start + s.jobs.end), gs((s) => 2 * s.jobs.total)).padStart(5)}      ${pct(contact, g.length).padStart(5)}`)
  }
  const text = out.join('\n')
  console.log(text)
  fs.writeFileSync(path.join(RES, `report-${m}.txt`), text)
}

;(async () => {
  const manifest: Manifest[] = JSON.parse(fs.readFileSync(path.join(FIX, 'manifest.json'), 'utf8')).filter((it: Manifest) => !filter || it.id.includes(filter))
  if (mode === 'rescore') {
    for (const m of fs.readdirSync(RES).filter((d) => fs.statSync(path.join(RES, d)).isDirectory())) report(m, manifest)
    return
  }
  if (!parserFor(mode)) throw new Error('unknown mode ' + mode)
  await runMode(mode, manifest)
  report(mode, manifest)
})()
