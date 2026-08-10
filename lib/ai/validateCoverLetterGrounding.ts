/**
 * Cover letter grounding validator (TASK-065).
 *
 * docs/PROMPTS.md §7/§8: "same validator." A literal port isn't possible —
 * lib/ai/validateGrounding.ts's checks are shaped around the resume
 * optimizer's exact JSON (experience_blocks keyed by profile_experience_id,
 * a skills_order permutation) and a cover letter has neither: it's prose
 * drawing on the whole profile at once, not one entry at a time.
 *
 * What carries over is the PRINCIPLE, applied at the same severity levels:
 *   - malformed JSON / wrong shape -> hard failure (§7 check 4)
 *   - a number not traceable to the profile -> flagged, not rejected
 *     (§7 check 2), checked against the WHOLE profile's numeric content
 *     rather than one entry, since a letter can legitimately reference any
 *     part of the candidate's background in one paragraph
 *
 * Fabricated entities (an invented employer, certification, or credential)
 * are NOT checked here with string/entity matching — that would be fragile
 * pattern-matching on free prose, prone to false positives, and this
 * project already has a precedent for exactly this tradeoff:
 * lib/ai/atsScorePrompt.ts's validateAtsScoreResult() also relies on the
 * system prompt's GROUNDING_INSTRUCTION to carry claim-level accuracy, and
 * only validates structure in code. Same trust boundary here, not a weaker
 * one invented for this file.
 */

import type { CareerProfileFull } from '@/types/careerProfile'

export type CoverLetterFailureSeverity = 'hard' | 'flag'

export type CoverLetterFailureCode =
  | 'malformed_json'
  | 'schema_violation'
  | 'unsourced_numeric'

export interface CoverLetterValidationFailure {
  code: CoverLetterFailureCode
  severity: CoverLetterFailureSeverity
  path: string
  /** PII-free description. Safe to log. */
  detail: string
  /** Derived from user content. NEVER log this. Retry-prompt use only. */
  offendingValue?: string
}

export interface CoverLetterValidationResult {
  valid: boolean
  failures: CoverLetterValidationFailure[]
}

export interface ParsedCoverLetter {
  greeting: string
  opening_paragraph: string
  body_paragraphs: string[]
  closing_paragraph: string
  sign_off: string
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

function extractNumbers(text: string): string[] {
  const matches = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []
  return matches.map((m) => m.replace(/,/g, '').replace(/\.0+$/, ''))
}

function collectNumbers(texts: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>()
  for (const t of texts) {
    if (!t) continue
    for (const n of extractNumbers(t)) out.add(n)
  }
  return out
}

/** Every number that legitimately exists anywhere in the profile — the
 *  letter may reference any of it, not just one entry (unlike the resume
 *  optimizer's per-block check). */
function collectProfileNumbers(profile: CareerProfileFull): Set<string> {
  const texts: Array<string | null | undefined> = [profile.professional_summary]
  for (const e of profile.work_experience ?? []) {
    texts.push(e.description, e.start_date, e.end_date, ...(e.highlights ?? []))
  }
  for (const c of profile.certifications ?? []) {
    texts.push(c.issue_date)
  }
  for (const ed of profile.education ?? []) {
    texts.push(ed.start_year != null ? String(ed.start_year) : null)
    texts.push(ed.end_year != null ? String(ed.end_year) : null)
  }
  return collectNumbers(texts)
}

export function validateCoverLetterGrounding(
  profile: CareerProfileFull,
  output: unknown,
): CoverLetterValidationResult {
  let parsed: unknown = output
  if (typeof output === 'string') {
    try {
      parsed = JSON.parse(output)
    } catch {
      return {
        valid: false,
        failures: [
          {
            code: 'malformed_json',
            severity: 'hard',
            path: 'output',
            detail: 'Model output is not valid JSON. Not repaired by guessing.',
          },
        ],
      }
    }
  }

  if (!isRecord(parsed)) {
    return {
      valid: false,
      failures: [
        {
          code: 'schema_violation',
          severity: 'hard',
          path: 'output',
          detail: 'Model output is not a JSON object.',
        },
      ],
    }
  }

  const failures: CoverLetterValidationFailure[] = []

  const requiredStringFields: Array<keyof ParsedCoverLetter> = [
    'greeting',
    'opening_paragraph',
    'closing_paragraph',
    'sign_off',
  ]
  for (const field of requiredStringFields) {
    if (typeof parsed[field] !== 'string' || (parsed[field] as string).trim() === '') {
      failures.push({
        code: 'schema_violation',
        severity: 'hard',
        path: `output.${field}`,
        detail: `Missing or empty \`${field}\` (expected a non-empty string).`,
      })
    }
  }

  const bodyParagraphs = parsed.body_paragraphs
  if (!isStringArray(bodyParagraphs) || bodyParagraphs.length === 0 || bodyParagraphs.length > 3) {
    failures.push({
      code: 'schema_violation',
      severity: 'hard',
      path: 'output.body_paragraphs',
      detail: 'Missing or malformed `body_paragraphs` (expected 1-3 strings).',
    })
  }

  // Only check numerics if the shape is otherwise sound — no point flagging
  // numbers inside a field we've already rejected as malformed.
  if (!failures.some((f) => f.severity === 'hard')) {
    const profileNumbers = collectProfileNumbers(profile)
    const allText = [
      parsed.opening_paragraph as string,
      ...(bodyParagraphs as string[]),
      parsed.closing_paragraph as string,
    ]
    allText.forEach((text, i) => {
      for (const n of extractNumbers(text)) {
        if (!profileNumbers.has(n)) {
          failures.push({
            code: 'unsourced_numeric',
            severity: 'flag',
            path: i === 0 ? 'output.opening_paragraph' : i === allText.length - 1 ? 'output.closing_paragraph' : `output.body_paragraphs[${i - 1}]`,
            detail: 'Letter contains a number not present anywhere in the profile.',
            offendingValue: n,
          })
        }
      }
    })
  }

  return {
    valid: !failures.some((f) => f.severity === 'hard'),
    failures,
  }
}
