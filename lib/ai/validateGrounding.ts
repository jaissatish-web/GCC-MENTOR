/**
 * Post-generation grounding validator (TASK-019).
 *
 * Implements the four mandatory checks in docs/PROMPTS.md §7. Every generation
 * response passes through this BEFORE it reaches a user (docs/RULES.md §2).
 *
 * Two severities:
 *   'hard' — the output is not fit to show. `valid` is false.
 *   'flag' — grounding is intact but the output needs review (§7 check 2 says
 *            unsourced numerics are "flagged", not rejected outright).
 *
 * PII CONTRACT: `detail` is always safe to log — it never contains a field
 * value. Anything derived from user content goes in `offendingValue`, which
 * callers MUST NOT log (docs/RULES.md §3). It exists only so the retry prompt
 * in TASK-021 can tell the model what to remove.
 */

import type { CareerProfileFull } from '@/types/careerProfile'

export type FailureSeverity = 'hard' | 'flag'

export type FailureCode =
  | 'malformed_json'
  | 'schema_violation'
  | 'unknown_experience_block'
  | 'duplicate_experience_block'
  | 'source_bullets_mutated'
  | 'unoptimized_block_rewritten'
  | 'fixed_field_emitted'
  | 'unsourced_numeric'
  | 'skills_not_permutation'
  | 'skills_returned_as_names'

export interface ValidationFailure {
  code: FailureCode
  severity: FailureSeverity
  /** Location in the output, e.g. `experience_blocks[2].generated_bullets[0]`. */
  path: string
  /** PII-free description. Safe to log. */
  detail: string
  /** Derived from user content. NEVER log this. Retry-prompt use only. */
  offendingValue?: string
}

export interface ValidationResult {
  valid: boolean
  failures: ValidationFailure[]
}

/**
 * Fixed fields must never be emitted by the model at all — they are read live
 * from career_profiles at render time (docs/CAREER_PROFILE.md §6). Any of these
 * keys appearing anywhere in the output means the model tried to own a fixed
 * field, which is a mutation risk regardless of whether the value happens to
 * match right now.
 */
const FIXED_FIELD_KEYS = new Set([
  'full_name',
  'name',
  'photo_url',
  'nationality',
  'date_of_birth',
  'passport_type',
  'passport_validity_date',
  'visa_status',
  'visa_transferable',
  'notice_period',
  'current_location',
  'phone',
  'whatsapp',
  'email',
  'linkedin_url',
  'company',
  'employer',
  'role',
  'job_title',
  'title',
  'start_date',
  'end_date',
  'location',
  'degree',
  'institution',
  'field_of_study',
  'issuer',
  'issue_date',
  'expiry_date',
])

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

/** Extract comparable numeric tokens. "400+" and "1,400" normalise to 400 / 1400. */
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

/** Walk an arbitrary output object looking for fixed-field keys. */
function findFixedFieldKeys(
  value: unknown,
  path: string,
  found: ValidationFailure[],
): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => findFixedFieldKeys(v, `${path}[${i}]`, found))
    return
  }
  if (!isRecord(value)) return

  for (const [key, child] of Object.entries(value)) {
    // source_* and profile_experience_id are legitimate structural references,
    // not the model asserting a fixed field.
    const isStructural =
      key.startsWith('source_') || key === 'profile_experience_id'

    if (!isStructural && FIXED_FIELD_KEYS.has(key)) {
      found.push({
        code: 'fixed_field_emitted',
        severity: 'hard',
        path: `${path}.${key}`,
        detail: `Output contains fixed field key "${key}". Fixed fields are read from career_profiles at render time and must never be emitted by the model.`,
      })
    }
    findFixedFieldKeys(child, `${path}.${key}`, found)
  }
}

/**
 * Validate a generation response against the profile that sourced it.
 *
 * @param profile The profile injected into the prompt — the only source of truth.
 * @param output  Raw model text, or an already-parsed object.
 * @param skillsOrder Optional returned skill ordering (§7 check 3). Pass the
 *   model's skills array; omit when the run did not reorder skills.
 */
export function validateGrounding(
  profile: CareerProfileFull,
  output: unknown,
  skillsOrder?: unknown,
): ValidationResult {
  const failures: ValidationFailure[] = []

  // --- Check 4: schema. Malformed JSON is a failure, never repaired by guessing.
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

  // --- Check 1a: no fixed fields anywhere in the output.
  findFixedFieldKeys(parsed, 'output', failures)

  // --- Summary block.
  const summary = parsed.summary
  if (!isRecord(summary) || typeof summary.generated !== 'string') {
    failures.push({
      code: 'schema_violation',
      severity: 'hard',
      path: 'output.summary',
      detail: 'Missing or malformed `summary.generated` (expected a string).',
    })
  }

  // --- Experience blocks.
  const blocks = parsed.experience_blocks
  if (!Array.isArray(blocks)) {
    failures.push({
      code: 'schema_violation',
      severity: 'hard',
      path: 'output.experience_blocks',
      detail: 'Missing or malformed `experience_blocks` (expected an array).',
    })
    return { valid: !failures.some((f) => f.severity === 'hard'), failures }
  }

  const experienceById = new Map(
    (profile.work_experience ?? []).map((e) => [e.id, e]),
  )
  const seenIds = new Set<string>()

  blocks.forEach((raw, i) => {
    const path = `output.experience_blocks[${i}]`
    if (!isRecord(raw)) {
      failures.push({
        code: 'schema_violation',
        severity: 'hard',
        path,
        detail: 'Experience block is not an object.',
      })
      return
    }

    const id = raw.profile_experience_id
    if (typeof id !== 'string') {
      failures.push({
        code: 'schema_violation',
        severity: 'hard',
        path: `${path}.profile_experience_id`,
        detail: 'Missing or non-string `profile_experience_id`.',
      })
      return
    }

    // --- Check 1b: an unknown id means the model invented an employer entry.
    const source = experienceById.get(id)
    if (!source) {
      failures.push({
        code: 'unknown_experience_block',
        severity: 'hard',
        path: `${path}.profile_experience_id`,
        detail:
          'Block references an experience id that is not in the profile. The model invented an employment entry.',
      })
      return
    }

    if (seenIds.has(id)) {
      failures.push({
        code: 'duplicate_experience_block',
        severity: 'hard',
        path: `${path}.profile_experience_id`,
        detail: 'Same profile experience returned in more than one block.',
      })
      return
    }
    seenIds.add(id)

    // --- Check 1c: the "before" must be the real before. A fabricated
    // source_bullets array makes the diff ("Wow #1") lie to the user.
    const sourceBullets = source.highlights ?? []
    if (raw.source_bullets !== undefined) {
      if (!isStringArray(raw.source_bullets)) {
        failures.push({
          code: 'schema_violation',
          severity: 'hard',
          path: `${path}.source_bullets`,
          detail: '`source_bullets` is not an array of strings.',
        })
      } else if (
        raw.source_bullets.length !== sourceBullets.length ||
        raw.source_bullets.some((b, j) => b !== sourceBullets[j])
      ) {
        failures.push({
          code: 'source_bullets_mutated',
          severity: 'hard',
          path: `${path}.source_bullets`,
          detail:
            'Returned source_bullets do not match the profile. The "before" side of the diff must be reproduced exactly.',
        })
      }
    }

    const generated = raw.generated_bullets
    const wasOptimized = raw.was_optimized === true

    if (generated !== undefined && generated !== null && !isStringArray(generated)) {
      failures.push({
        code: 'schema_violation',
        severity: 'hard',
        path: `${path}.generated_bullets`,
        detail: '`generated_bullets` is not an array of strings.',
      })
      return
    }

    // --- A block the user did not select must come back untouched.
    if (!wasOptimized && isStringArray(generated) && generated.length > 0) {
      const unchanged =
        generated.length === sourceBullets.length &&
        generated.every((b, j) => b === sourceBullets[j])
      if (!unchanged) {
        failures.push({
          code: 'unoptimized_block_rewritten',
          severity: 'hard',
          path: `${path}.generated_bullets`,
          detail:
            'Block is marked was_optimized=false but its bullets differ from the profile. Unselected blocks must not be rewritten.',
        })
      }
    }

    // --- Check 2: unsourced numerics, against THIS entry only (§7).
    if (isStringArray(generated)) {
      const sourceNumbers = collectNumbers([
        source.description,
        source.start_date,
        source.end_date,
        ...sourceBullets,
      ])
      generated.forEach((bullet, j) => {
        for (const n of extractNumbers(bullet)) {
          if (!sourceNumbers.has(n)) {
            failures.push({
              code: 'unsourced_numeric',
              severity: 'flag',
              path: `${path}.generated_bullets[${j}]`,
              detail:
                'Generated bullet contains a number not present in the corresponding profile entry.',
              offendingValue: n,
            })
          }
        }
      })
    }
  })

  // --- Check 3: skills are reordered, never edited.
  if (skillsOrder !== undefined) {
    const path = 'output.skills_order'
    if (!isStringArray(skillsOrder)) {
      failures.push({
        code: 'schema_violation',
        severity: 'hard',
        path,
        detail: '`skills_order` is not an array of strings.',
      })
    } else {
      const ids = (profile.skills ?? []).map((s) => s.id)
      const names = (profile.skills ?? []).map((s) => s.name)
      const sameMembers = (a: string[], b: string[]) =>
        a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ')

      if (sameMembers(skillsOrder, ids)) {
        // Correct: a permutation of the profile's skill ids.
      } else if (sameMembers(skillsOrder, names)) {
        // Grounding intact — no additions, removals or edits — but the model
        // returned names where the schema expects ids.
        failures.push({
          code: 'skills_returned_as_names',
          severity: 'flag',
          path,
          detail:
            'Skills came back as names rather than ids. Membership is correct, so grounding holds, but the caller must map them to ids before persisting.',
        })
      } else {
        failures.push({
          code: 'skills_not_permutation',
          severity: 'hard',
          path,
          detail:
            'Returned skills are not a permutation of the profile set — something was added, removed or edited.',
        })
      }
    }
  }

  return {
    valid: !failures.some((f) => f.severity === 'hard'),
    failures,
  }
}
