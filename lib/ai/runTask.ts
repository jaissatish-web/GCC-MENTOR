import type { CareerProfileFull } from '@/types/careerProfile'
import { generate, AIProviderError } from '@/lib/ai/provider'
import { GROUNDING_INSTRUCTION } from '@/lib/ai/grounding'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'

/**
 * THE LLM CONTROL LAYER — one place that owns every model call.
 *
 * Built 2026-08-17, founder decision: get the pipeline right before individual
 * services, so the services plug into this rather than being retrofitted later.
 *
 * WHAT WAS WRONG WITH THE OLD SHAPE. `lib/ai/provider.ts` is a good transport —
 * it resolves config, dispatches to a provider, falls back, logs usage and
 * diagnoses failures. But everything ABOVE transport was re-implemented by each
 * route: building the system prompt, remembering to include the grounding block,
 * parsing JSON out of a chat response, deciding whether the output was
 * acceptable, and retrying. Seven services, seven chances to forget one of them.
 *
 * "A generation route without the grounding instruction is a critical bug, not a
 * missing feature" (docs/02_PHILOSOPHY.md §1) — but nothing structurally stopped
 * one being written. This module makes it impossible instead of forbidden.
 *
 * WHAT THIS OWNS
 *   1. Which model runs a task, per service, resolved from the admin config.
 *   2. Prompt assembly, with grounding injected — never re-typed by a caller.
 *   3. The token budget, including headroom for reasoning models.
 *   4. Structured output: parse, validate, and ONE repair attempt.
 *   5. Refusing to return output that failed validation.
 *   6. Diagnostics that name the real failure.
 *
 * WHAT IT DELIBERATELY DOES NOT OWN
 *   - Authentication, ownership and rate limiting. Those belong to the route, in
 *     front of this call, and a module that quietly enforced them would hide
 *     where the real gate is.
 *   - What a prompt SAYS. Prompt text stays in its own per-service module; this
 *     assembles and guarantees, it does not author.
 */

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

/**
 * Every AI service in the product. One list, because there were two: the admin
 * screen carried its own copy and `providerConfig` another, so adding a service
 * meant remembering both.
 *
 * A key here is also the config key the model is resolved through, so a founder
 * changing the model for "cover_letter" in /admin changes exactly this task.
 */
export const AI_SERVICES = {
  extraction: { label: 'Resume Parsing', built: true },
  optimization: { label: 'Resume Optimization', built: true },
  ats_scan: { label: 'ATS / GCC Scanner', built: true },
  job_description: { label: 'Job Description Structuring', built: true },
  job_match_explanation: { label: 'Job Match Explanation', built: true },
  cover_letter: { label: 'Cover Letter', built: true },
  qa_generation: { label: 'Interview Q&A', built: false },
  mock_interview: { label: 'Mock Interview', built: false },
} as const

export type ServiceKey = keyof typeof AI_SERVICES

/**
 * Token budgets per service.
 *
 * REASONING MODELS SPEND THIS BUDGET BEFORE WRITING ANYTHING. The configured
 * default is one, and an under-budgeted call comes back with a populated
 * `reasoning` field and null content — which reads like a refusal and is not one.
 * `provider.ts` already reports that case properly; these numbers exist so it
 * happens less often.
 *
 * A caller may override, but the floor still applies: a budget too small to hold
 * an answer wastes the whole call rather than truncating it usefully.
 */
const TOKEN_BUDGET: Record<ServiceKey, number> = {
  extraction: 8000,
  optimization: 8000,
  ats_scan: 4000,
  job_description: 3000,
  job_match_explanation: 3000,
  cover_letter: 4000,
  qa_generation: 4000,
  mock_interview: 4000,
}

const MIN_TOKENS = 1500

/**
 * Near-zero by default. Every service here produces either structured data or
 * text that must not drift from the user's facts; neither benefits from
 * sampling variety, and a score a user is shown has to be reproducible.
 */
const DEFAULT_TEMPERATURE = 0.1

// ---------------------------------------------------------------------------
// Grounding policy — declared, never defaulted
// ---------------------------------------------------------------------------

export interface GroundingFailure {
  /** Safe to log. Never contains a field value. */
  detail: string
  /** Derived from user content. NEVER log. Repair-prompt use only. */
  offendingValue?: string
}

export interface GroundingCheck {
  valid: boolean
  failures: GroundingFailure[]
}

/**
 * A task must say which of these it is. There is no default and no optional
 * field, so "I forgot" is a type error rather than a silent security hole —
 * the same technique used to stop the Job Match semantic layer overriding a
 * deterministic score.
 *
 * `enforced`: the task writes prose from the user's profile. The grounding block
 * is injected verbatim and the output is validated before it is returned.
 *
 * `not_applicable`: the task does not write prose from the profile — structuring
 * a job advert, for example, where the source is the employer's text and there is
 * no user fact to invent. **A written reason is required**, because this is the
 * one escape hatch and an unexplained one is indistinguishable from a mistake.
 */
export type GroundingPolicy =
  | {
      mode: 'enforced'
      profile: CareerProfileFull
      check: (profile: CareerProfileFull, parsed: unknown) => GroundingCheck
    }
  | { mode: 'not_applicable'; reason: string }

// ---------------------------------------------------------------------------
// Task definition
// ---------------------------------------------------------------------------

export interface AiTask<T> {
  service: ServiceKey
  /** For the usage log — the route that caused the spend. */
  route: string
  userId?: string

  /** Who the model is being asked to be. Omit where a persona is meaningless. */
  persona?: string
  /** What to do. The task, not the facts. */
  instructions: string
  /** The facts and inputs. Sent as the user message. */
  input: string

  grounding: GroundingPolicy

  /**
   * Turn raw model text into a value. Defaults to JSON extraction, which is what
   * every current service wants; pass `(t) => t` for a task that genuinely wants
   * prose.
   */
  parse?: (text: string) => T
  /** Shape check, run before the grounding check. Return a reason to reject. */
  validateShape?: (parsed: T) => string | null

  maxTokens?: number
  temperature?: number
  /** One by default. Zero disables repair; more than two is not worth the spend. */
  repairAttempts?: number
}

export interface AiTaskResult<T> {
  value: T
  model: string
  attempts: number
  /** Non-fatal notes — a repair happened, a soft check flagged something. */
  notes: string[]
}

export class AiTaskError extends Error {
  constructor(
    message: string,
    readonly kind: 'provider' | 'unparseable' | 'invalid_shape' | 'ungrounded',
    readonly detail?: string,
  ) {
    super(message)
    this.name = 'AiTaskError'
  }
}

// ---------------------------------------------------------------------------
// The one entry point
// ---------------------------------------------------------------------------

/** Exported so the assembly can be asserted without spending a model call. */
export function buildSystemPrompt(task: AiTask<unknown>): string {
  const parts: string[] = []
  if (task.persona) parts.push(task.persona.trim())

  // INJECTED HERE, ONCE, FROM THE CONSTANT. A caller cannot paraphrase it,
  // shorten it, or forget it, because a caller never writes it.
  if (task.grounding.mode === 'enforced') parts.push(GROUNDING_INSTRUCTION)

  parts.push(task.instructions.trim())
  return parts.join('\n\n')
}

/**
 * Ask the model to fix its own output.
 *
 * The failure descriptions sent here MAY include `offendingValue`, because the
 * model needs to know which text to remove. That value is derived from user
 * content and is **never logged** — see the PII contract in validateGrounding.
 * Only `detail` reaches a log line.
 */
export function buildRepairInput(originalInput: string, failures: GroundingFailure[]): string {
  const list = failures
    .map((f, i) => `${i + 1}. ${f.detail}${f.offendingValue ? ` — remove: "${f.offendingValue}"` : ''}`)
    .join('\n')
  return (
    `${originalInput}\n\n` +
    `---\nYOUR PREVIOUS ANSWER WAS REJECTED. Fix these and return the corrected ` +
    `output in the same format. Do not explain the changes.\n${list}`
  )
}

export async function runAiTask<T>(task: AiTask<T>): Promise<AiTaskResult<T>> {
  const notes: string[] = []
  const parse = task.parse ?? ((text: string) => extractJsonObject(text) as T)
  const repairAttempts = task.repairAttempts ?? 1
  const maxTokens = Math.max(MIN_TOKENS, task.maxTokens ?? TOKEN_BUDGET[task.service])
  const temperature = task.temperature ?? DEFAULT_TEMPERATURE
  const system = buildSystemPrompt(task as AiTask<unknown>)

  let input = task.input
  let lastDetail = ''

  for (let attempt = 1; attempt <= repairAttempts + 1; attempt++) {
    // --- transport ---------------------------------------------------------
    let raw: { text: string; inputTokens: number; outputTokens: number }
    try {
      raw = await generate({
        system,
        user: input,
        maxTokens,
        temperature,
        userId: task.userId,
        route: task.route,
        // The service key IS the config key, so /admin's per-service model
        // choice applies without any mapping table in between.
        configKey: task.service,
      })
    } catch (e) {
      // A provider failure is not retried here. `provider.ts` already tried the
      // configured fallback, and retrying a transport error in a loop turns one
      // outage into several billable calls.
      const why = e instanceof AIProviderError ? e.message : String(e)
      throw new AiTaskError(`AI provider failed for ${task.service}: ${why}`, 'provider', why)
    }

    // --- parse -------------------------------------------------------------
    let parsed: T
    try {
      parsed = parse(raw.text)
    } catch {
      lastDetail = 'response was not valid JSON'
      if (attempt <= repairAttempts) {
        notes.push('repaired: unparseable response')
        input = buildRepairInput(task.input, [{ detail: 'Your response was not valid JSON. Return only the JSON object.' }])
        continue
      }
      throw new AiTaskError(`${task.service}: ${lastDetail}`, 'unparseable', lastDetail)
    }

    // --- shape -------------------------------------------------------------
    const shapeError = task.validateShape?.(parsed) ?? null
    if (shapeError) {
      lastDetail = shapeError
      if (attempt <= repairAttempts) {
        notes.push(`repaired: ${shapeError}`)
        input = buildRepairInput(task.input, [{ detail: shapeError }])
        continue
      }
      throw new AiTaskError(`${task.service}: ${shapeError}`, 'invalid_shape', shapeError)
    }

    // --- grounding ---------------------------------------------------------
    // The output does not leave this function until it has passed. There is no
    // branch that returns unvalidated content.
    if (task.grounding.mode === 'enforced') {
      const result = task.grounding.check(task.grounding.profile, parsed)
      if (!result.valid) {
        // Only `detail` is joined for logging. `offendingValue` goes to the
        // repair prompt and nowhere else.
        lastDetail = result.failures.map((f) => f.detail).join('; ')
        if (attempt <= repairAttempts) {
          notes.push('repaired: grounding failures')
          input = buildRepairInput(task.input, result.failures)
          continue
        }
        console.error(
          `runAiTask: ${task.service} failed grounding after ${attempt} attempts route=${task.route} — ${lastDetail}`,
        )
        throw new AiTaskError(
          `${task.service}: output could not be grounded in the profile`,
          'ungrounded',
          lastDetail,
        )
      }
    }

    return { value: parsed, model: task.service, attempts: attempt, notes }
  }

  // Unreachable: the loop either returns or throws. Present so the function has
  // no implicit undefined path.
  throw new AiTaskError(`${task.service}: exhausted attempts — ${lastDetail}`, 'invalid_shape', lastDetail)
}
