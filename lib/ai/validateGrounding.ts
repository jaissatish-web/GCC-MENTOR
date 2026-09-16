/**
 * Post-generation grounding validator (TASK-019; extended 2026-09-16).
 *
 * Every generation response passes through this BEFORE it reaches a user
 * (docs/RULES.md §2).
 *
 * Three things changed in the universal-optimizer work, all of them holes that
 * executable code — not comments — proved were reachable:
 *
 *   1. THE SUMMARY WAS NEVER VALIDATED. The only check on it was
 *      `typeof summary.generated === 'string'`. The summary is where
 *      "15+ years" becomes "nearly 20 years", and it had no number check, no
 *      entity check, nothing.
 *   2. UNSOURCED NUMBERS ONLY FLAGGED. Severity was 'flag', and `valid` is
 *      computed from hard failures alone, so a bullet containing an invented
 *      figure shipped to the user. They are hard now.
 *   3. EMPLOYMENT DATES COUNTED AS SOURCE NUMBERS. `start_date` and `end_date`
 *      fed the allowed set, so a role dated 2016 legitimised "2016" as a
 *      quantity. Dates are employment facts, not achievement figures, and are
 *      excluded (see lib/ai/profileEntities.ts).
 *
 * Two severities, unchanged in meaning:
 *   'hard' — the output is not fit to show as-is. `valid` is false.
 *   'flag' — grounding is intact but the output warrants review.
 *
 * WHAT IS NEW AND WHY IT MATTERS TO THE CALLER: every failure now names its
 * `owner` — 'structural', 'summary', or a specific profile_experience_id. That
 * is what lets the route fall back one block at a time instead of failing the
 * whole resume (app/api/optimize/route.ts). A structural failure cannot be
 * fallen back from, because output you cannot parse has no blocks to keep.
 *
 * PII CONTRACT: `detail` is always safe to log — it never contains a field
 * value. Anything derived from user content goes in `offendingValue`, which
 * callers MUST NOT log (docs/RULES.md §3). It exists only so the retry prompt
 * can tell the model what to remove.
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import {
  buildProfileEntities,
  extractNamedEntities,
  extractNumbers,
  isCrossEntryLeak,
  type ProfileEntities,
} from './profileEntities'
import { normalizeSkillsOrder } from './skillsOrder'

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
  // --- 2026-09-16 ---
  | 'unsourced_summary_numeric'
  | 'years_of_experience_altered'
  | 'jd_only_entity'
  | 'cross_entry_leak'
  | 'unknown_entity'

/**
 * Who owns this failure, and therefore what the caller can do about it.
 * 'structural' cannot be repaired by falling back — there is nothing to keep.
 */
export type FailureOwner =
  | 'structural'
  | 'summary'
  /**
   * Presentation metadata the caller always repairs (lib/ai/skillsOrder.ts).
   * Never structural, never a fallback, never a reason to reject the resume.
   */
  | 'skills_order'
  | { experienceId: string }

export interface ValidationFailure {
  code: FailureCode
  severity: FailureSeverity
  /** Location in the output, e.g. `experience_blocks[2].generated_bullets[0]`. */
  path: string
  /** PII-free description. Safe to log. */
  detail: string
  /** Derived from user content. NEVER log this. Retry-prompt use only. */
  offendingValue?: string
  /** Added 2026-09-16 so the caller can fall back per block. */
  owner: FailureOwner
}

export interface ValidationResult {
  valid: boolean
  failures: ValidationFailure[]
}

export interface ValidateOptions {
  /**
   * The advert, when one was supplied. Used ONLY to tell an imported
   * requirement (hard) from an ordinary unknown token (flag) — never as a
   * source of permitted facts.
   */
  jobDescription?: string | null
  /**
   * Escape hatch for the numerics severity change. Defaults to strict. Set
   * false to restore pre-2026-09-16 behaviour without a deploy if the
   * fallback rate turns out to be worse than expected.
   */
  strictNumerics?: boolean
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
        owner: 'structural',
        path: `${path}.${key}`,
        detail: `Output contains fixed field key "${key}". Fixed fields are read from career_profiles at render time and must never be emitted by the model.`,
      })
    }
    findFixedFieldKeys(child, `${path}.${key}`, found)
  }
}

/** "15+ years", "15 years", "15+ yrs" -> the number that precedes the unit. */
function extractYearClaims(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/(\d[\d,]*)\s*\+?\s*(?:years?|yrs?)\b/gi)) {
    out.push(m[1].replace(/,/g, ''))
  }
  return out
}

/**
 * Entity checking for one piece of generated text.
 *
 * Deliberately conservative — see lib/ai/profileEntities.ts for why a
 * token-level diff was rejected. Three outcomes only:
 *   - supported anywhere in the profile (or this entry)      -> nothing
 *   - present in the job description but nowhere in profile  -> hard
 *   - present in neither                                     -> flag
 *
 * The middle case is the one that matters and the one that is precise: it
 * requires the employer to have asked for a thing AND the candidate never to
 * have claimed it. That is exactly an imported requirement.
 */
function checkEntities(
  text: string,
  path: string,
  owner: FailureOwner,
  entities: ProfileEntities,
  jdEntities: Set<string> | null,
  entryId: string | null,
  failures: ValidationFailure[],
): void {
  const entryEntities = entryId ? entities.entries.get(entryId)?.entities : undefined

  for (const candidate of extractNamedEntities(text)) {
    const supportedHere =
      (entryEntities?.has(candidate) ?? false) ||
      entities.skills.has(candidate) ||
      entities.certifications.has(candidate) ||
      entities.education.has(candidate)

    // The summary may combine facts from across the whole profile.
    const supportedProfileWide = entryId === null && entities.all.has(candidate)

    if (supportedHere || supportedProfileWide) continue

    // A fact that belongs to exactly one OTHER employment entry.
    if (entryId !== null && isCrossEntryLeak(entities, entryId, candidate)) {
      failures.push({
        code: 'cross_entry_leak',
        severity: 'hard',
        owner,
        path,
        detail:
          'Generated text attributes to this employment entry an identifiable fact that appears only in a different entry.',
        offendingValue: candidate,
      })
      continue
    }

    if (jdEntities?.has(candidate)) {
      failures.push({
        code: 'jd_only_entity',
        severity: 'hard',
        owner,
        path,
        detail:
          'Generated text contains a requirement that appears in the job description but is absent from the career profile.',
        offendingValue: candidate,
      })
      continue
    }

    failures.push({
      code: 'unknown_entity',
      severity: 'flag',
      owner,
      path,
      detail:
        'Generated text contains an identifiable term not found in the career profile. Flagged for review; paraphrase can produce this legitimately.',
      offendingValue: candidate,
    })
  }
}

/**
 * Validate a generation response against the profile that sourced it.
 *
 * @param profile The profile injected into the prompt — the only source of truth.
 * @param output  Raw model text, or an already-parsed object.
 * @param skillsOrder The model's returned skill ordering, as-is. Missing or
 *   malformed values are recorded as a 'skills_order' flag, never a hard failure.
 * @param options JD text (for import detection) and the numerics escape hatch.
 */
export function validateGrounding(
  profile: CareerProfileFull,
  output: unknown,
  skillsOrder?: unknown,
  options?: ValidateOptions,
): ValidationResult {
  const failures: ValidationFailure[] = []
  const strictNumerics = options?.strictNumerics !== false
  const numericSeverity: FailureSeverity = strictNumerics ? 'hard' : 'flag'

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
            owner: 'structural',
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
          owner: 'structural',
          path: 'output',
          detail: 'Model output is not a JSON object.',
        },
      ],
    }
  }

  const entities = buildProfileEntities(profile)
  const jdEntities =
    options?.jobDescription && options.jobDescription.trim() !== ''
      ? extractNamedEntities(options.jobDescription)
      : null

  // --- Check 1a: no fixed fields anywhere in the output.
  findFixedFieldKeys(parsed, 'output', failures)

  // --- Summary block.
  const summary = parsed.summary
  if (!isRecord(summary) || typeof summary.generated !== 'string') {
    failures.push({
      code: 'schema_violation',
      severity: 'hard',
      owner: 'structural',
      path: 'output.summary',
      detail: 'Missing or malformed `summary.generated` (expected a string).',
    })
  } else if (summary.generated.trim() !== '') {
    const text = summary.generated
    const path = 'output.summary.generated'

    // Numbers: profile-wide factual prose, dates excluded.
    for (const n of extractNumbers(text)) {
      if (!entities.summaryNumbers.has(n)) {
        failures.push({
          code: 'unsourced_summary_numeric',
          severity: numericSeverity,
          owner: 'summary',
          path,
          detail:
            'Professional summary contains a number not present anywhere in the career profile.',
          offendingValue: n,
        })
      }
    }

    // Stated experience duration must survive exactly.
    const sourceYears = new Set(extractYearClaims(profile.professional_summary ?? ''))
    if (sourceYears.size > 0) {
      for (const y of extractYearClaims(text)) {
        if (!sourceYears.has(y)) {
          failures.push({
            code: 'years_of_experience_altered',
            severity: 'hard',
            owner: 'summary',
            path,
            detail:
              'Professional summary states a different number of years of experience than the profile does.',
            offendingValue: y,
          })
        }
      }
    }

    checkEntities(text, path, 'summary', entities, jdEntities, null, failures)
  }

  // --- Experience blocks.
  const blocks = parsed.experience_blocks
  if (!Array.isArray(blocks)) {
    failures.push({
      code: 'schema_violation',
      severity: 'hard',
      owner: 'structural',
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
        owner: 'structural',
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
        owner: 'structural',
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
        owner: 'structural',
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
        owner: 'structural',
        path: `${path}.profile_experience_id`,
        detail: 'Same profile experience returned in more than one block.',
      })
      return
    }
    seenIds.add(id)

    const owner: FailureOwner = { experienceId: id }

    // --- Check 1c: the "before" must be the real before. A fabricated
    // source_bullets array makes the diff ("Wow #1") lie to the user.
    const sourceBullets = source.highlights ?? []
    if (raw.source_bullets !== undefined) {
      if (!isStringArray(raw.source_bullets)) {
        failures.push({
          code: 'schema_violation',
          severity: 'hard',
          owner: 'structural',
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
          owner: 'structural',
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
        owner: 'structural',
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
          owner,
          path: `${path}.generated_bullets`,
          detail:
            'Block is marked was_optimized=false but its bullets differ from the profile. Unselected blocks must not be rewritten.',
        })
      }
    }

    // --- Content checks, against THIS entry only.
    if (isStringArray(generated)) {
      const entrySources = entities.entries.get(id)
      const sourceNumbers = entrySources?.numbers ?? new Set<string>()

      generated.forEach((bullet, j) => {
        const bulletPath = `${path}.generated_bullets[${j}]`
        for (const n of extractNumbers(bullet)) {
          if (!sourceNumbers.has(n)) {
            failures.push({
              code: 'unsourced_numeric',
              severity: numericSeverity,
              owner,
              path: bulletPath,
              detail:
                'Generated bullet contains a number not present in the corresponding profile entry.',
              offendingValue: n,
            })
          }
        }
        checkEntities(bullet, bulletPath, owner, entities, jdEntities, id, failures)
      })
    }
  })

  // --- Check 3: skills are reordered, never edited.
  //
  // RECOVERABLE, never structural (2026-09-16). The ordering is interpreted by
  // normalizeSkillsOrder() — the same function the route persists with — which
  // keeps only real profile skills and appends every omitted one. Nothing the
  // model writes here can add, rename or remove a skill, so a messy list is a
  // warning to record, not a reason to discard the resume. It is checked even
  // when the model omitted skills_order entirely, so a missing list is recorded.
  const skillRepair = normalizeSkillsOrder(profile.skills ?? [], skillsOrder)
  if (skillRepair.codes.length > 0) {
    failures.push({
      code: skillRepair.repaired ? 'skills_not_permutation' : 'skills_returned_as_names',
      severity: 'flag',
      owner: 'skills_order',
      path: 'output.skills_order',
      // Fixed repair codes only — never a model value or skill name.
      detail: 'Skill ordering normalized: ' + skillRepair.codes.join(','),
    })
  }

  return {
    valid: !failures.some((f) => f.severity === 'hard'),
    failures,
  }
}

/**
 * Split hard failures into the ones a caller can repair by falling back and
 * the ones it cannot. Structural failures leave nothing to keep.
 */
export function partitionFailures(failures: ValidationFailure[]): {
  structural: ValidationFailure[]
  summary: ValidationFailure[]
  byExperienceId: Map<string, ValidationFailure[]>
} {
  const structural: ValidationFailure[] = []
  const summary: ValidationFailure[] = []
  const byExperienceId = new Map<string, ValidationFailure[]>()

  for (const f of failures) {
    if (f.severity !== 'hard') continue
    // Repaired by normalizeSkillsOrder before persisting, whatever its severity.
    if (f.owner === 'skills_order') continue
    if (f.owner === 'structural') structural.push(f)
    else if (f.owner === 'summary') summary.push(f)
    else {
      const list = byExperienceId.get(f.owner.experienceId) ?? []
      list.push(f)
      byExperienceId.set(f.owner.experienceId, list)
    }
  }
  return { structural, summary, byExperienceId }
}
