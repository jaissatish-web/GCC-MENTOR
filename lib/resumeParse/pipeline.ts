import { generate } from '@/lib/ai/provider'
import { attachLooseDuties } from './looseDuties'
import { extractJsonObject, normalizeDraft } from '@/lib/ai/extractionPrompt'
import type { CareerProfileDraft } from '@/types/careerProfile'
import { checkDraft, type ParseWarning } from './check'
import { docxLayoutText, pdfLayoutText } from './layoutText'
import { prepass } from './prepass'
import { EXTRACTION_PROMPT_V2, repairNote } from './prompt'

/**
 * CV → Career Profile draft, v2 (2026-10-01). The one entry point used by
 * /api/parse/upload, /api/parse/text and /api/ats-scan.
 *
 *   1. layout-aware text      lib/resumeParse/layoutText.ts
 *   2. pattern pre-pass       lib/resumeParse/prepass.ts   (email, phone, DOB…)
 *   3. ONE fast model call    same model as before, thinking off, fast hosts first
 *   4. checks                 lib/resumeParse/check.ts     (dates, evidence, coverage)
 *   5. one re-read            only when 4 found something MISSING, with the list
 *
 * Measured on the resume-lab test set (scripts/resume-lab, 96 CVs in 14 messy
 * layouts) — see docs/07_CAREER_PROFILE.md "Resume parsing v2" for the numbers.
 *
 * What it does NOT do: authentication, limits, charging, saving. Those stay in
 * the routes, in front of this call, exactly where they were.
 */

export type ParseInput = { kind: 'pdf' | 'docx'; buffer: Buffer } | { kind: 'text'; text: string }

export interface ParseReport {
  version: 'v2'
  ms: number
  attempts: number
  repaired: boolean
  inputTokens: number
  outputTokens: number
  host: string | null
  /** Layout notes ("pdf: page 1 read as two columns"). No CV content. */
  layout: string[]
  /** Field-level "please check" notes for the editor. Field paths, never values. */
  warnings: ParseWarning[]
}

export type ParseFailure =
  | 'PDF_SCANNED' | 'PDF_UNREADABLE' | 'DOCX_UNREADABLE' | 'TOO_SHORT' | 'TOO_LONG'
  | 'EXTRACTION_TRUNCATED' | 'EXTRACTION_FAILED'

export type ParseResult =
  | { ok: true; draft: CareerProfileDraft; report: ParseReport; text: string }
  | { ok: false; code: ParseFailure; detail?: string }

/**
 * Hosts tried first, fastest first — measured 2026-10-01 on the same CV with
 * thinking off: Novita 6.7s, GMICloud 7.3s, Alibaba 10.2s, AtlasCloud 11.1s,
 * StreamLake 12.0s, Baidu 12.4s … DeepInfra 31s, OpenInference 47s. Any other
 * host remains a fallback (see GenerateParams.openRouter). Speeds drift, so
 * re-measure now and then: scripts/resume-lab/hosts.mjs.
 */
export const FAST_HOSTS = ['Novita', 'GMICloud', 'Alibaba', 'AtlasCloud', 'StreamLake', 'Baidu']

/** About 12 pages of CV text — the upload route's existing ceiling. */
const MAX_TEXT_CHARS = 30_000
const MIN_TEXT_CHARS = 50
/** Whole-parse budget: far inside the platform's 300s, and a re-read only starts with room to finish. */
const BUDGET_MS = 120_000
const REPAIR_NEEDS_MS = 40_000
/** One HTTP attempt: a fast host answers a long CV in ~15s; past this it has stalled. */
const STALL_MS = 50_000
const MAX_TOKENS = 8192

export type ReadResult = { ok: true; text: string; layout: string[] } | { ok: false; code: ParseFailure; detail?: string }

/**
 * Step 1 alone: the file's text, with its layout, and the gates that refuse a
 * file before any model call (scan, failed decode, too short, too long). The
 * routes run this BEFORE their limit checks and reservation, exactly where
 * their old text extraction ran, so a refused file still costs the user nothing.
 */
export async function readResumeText(input: ParseInput): Promise<ReadResult> {
  let text: string
  const layout: string[] = []
  if (input.kind === 'text') {
    text = input.text.replace(/\r\n?/g, '\n').trim()
  } else if (input.kind === 'pdf') {
    const r = await pdfLayoutText(input.buffer)
    layout.push(...r.notes)
    if (r.scanned) return { ok: false, code: 'PDF_SCANNED' }
    if (r.garbled) return { ok: false, code: 'PDF_UNREADABLE' }
    text = r.text
  } else {
    try {
      const r = await docxLayoutText(input.buffer)
      layout.push(...r.notes)
      text = r.text
    } catch (e) {
      return { ok: false, code: 'DOCX_UNREADABLE', detail: e instanceof Error ? e.message : String(e) }
    }
  }
  if (text.trim().length < MIN_TEXT_CHARS) return { ok: false, code: 'TOO_SHORT' }
  if (text.length > MAX_TEXT_CHARS) return { ok: false, code: 'TOO_LONG' }
  return { ok: true, text, layout }
}

/**
 * Steps 2–5: patterns, the model call, the checks, and at most one re-read.
 * Never throws — a failure is a code the route turns into its own message.
 */
export async function extractProfile(
  text: string,
  opts: { route: string; userId?: string; layout?: string[]; startedAt?: number },
): Promise<ParseResult> {
  const started = opts.startedAt ?? Date.now()
  const giveUpAt = Date.now() + BUDGET_MS
  const pre = prepass(text)

  let inputTokens = 0, outputTokens = 0, attempts = 0
  let host: string | null = null
  let best: ReturnType<typeof checkDraft> | null = null
  let note = ''
  for (let round = 0; round < 2; round++) {
    if (round === 1 && giveUpAt - Date.now() < REPAIR_NEEDS_MS) break
    attempts++
    let raw
    try {
      raw = await generate({
        system: EXTRACTION_PROMPT_V2,
        user: `Resume text:\n\n${text}${note}`,
        maxTokens: MAX_TOKENS,
        temperature: 0,
        userId: opts.userId,
        route: opts.route,
        configKey: 'extraction',
        giveUpAt,
        stallTimeoutMs: STALL_MS,
        openRouter: { reasoningOff: true, preferHosts: FAST_HOSTS },
      })
    } catch (e) {
      if (best) break // keep the first reading rather than fail the whole parse
      if (round === 0) { note = ''; continue }
      return { ok: false, code: 'EXTRACTION_FAILED', detail: e instanceof Error ? e.message : String(e) }
    }
    inputTokens += raw.inputTokens
    outputTokens += raw.outputTokens
    host = raw.served ?? host
    const normalized = raw.truncated ? null : normalizeDraft(extractJsonObject(raw.text))
    if (!normalized) {
      if (best) break
      if (round === 0) { note = ''; continue }
      return { ok: false, code: raw.truncated ? 'EXTRACTION_TRUNCATED' : 'EXTRACTION_FAILED' }
    }
    const checked = checkDraft(normalized, text, pre)
    // Keep whichever reading is more complete: fewer critical problems, then more jobs.
    if (!best || checked.critical.length < best.critical.length ||
        (checked.critical.length === best.critical.length && checked.draft.work_experience.length > best.draft.work_experience.length)) {
      best = checked
    }
    if (!best.critical.length) break
    note = repairNote(best.critical)
  }
  if (!best) return { ok: false, code: 'EXTRACTION_FAILED' }
  // Safety net: a "Job responsibilities" block the model left out goes under the
  // most recent job, in the CV's own words, with a note (launch audit 2026-10-02).
  const loose = attachLooseDuties(best.draft, text)

  return {
    ok: true,
    draft: best.draft,
    text,
    report: {
      version: 'v2',
      ms: Date.now() - started,
      attempts,
      repaired: attempts > 1,
      inputTokens,
      outputTokens,
      host,
      layout: opts.layout ?? [],
      warnings: loose ? [...best.warnings, loose] : best.warnings,
    },
  }
}

/** Read + extract in one call (scripts/resume-lab/eval.ts). Routes call the two steps. */
export async function parseResume(input: ParseInput, opts: { route: string; userId?: string }): Promise<ParseResult> {
  const startedAt = Date.now()
  const read = await readResumeText(input)
  if (!read.ok) return read
  return extractProfile(read.text, { ...opts, layout: read.layout, startedAt })
}
