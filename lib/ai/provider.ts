import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { getProviderConfig, getProviderConfigExact, AI_CONFIG_KEY_DEFAULT } from '@/lib/ai/providerConfig'

export class AIProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); this.name = 'AIProviderError' }
}

/**
 * An attempt that got no answer in time (2026-09-12).
 *
 * Founder report: a CV build hung for the platform's full 300 seconds — Vercel's
 * log showed one POST to the model and nothing back, and no usage row was ever
 * written. Measured the next morning, the same model through OpenRouter answers
 * at 75–111 tokens a second from four different upstreams, so even the largest
 * resume is ~100s. Five minutes is not a slow answer; it is an upstream that
 * stalled. Nothing here had a timeout, so a stall simply ran until the platform
 * killed the function and showed its own error page.
 */
class StallError extends AIProviderError {
  constructor(message: string) { super(message); this.name = 'StallError' }
}

/** Longest one HTTP attempt may wait for its answer. `AI_STALL_TIMEOUT_MS` overrides (tests). */
const STALL_TIMEOUT_MS = (() => {
  const n = Number(process.env.AI_STALL_TIMEOUT_MS)
  return Number.isFinite(n) && n > 0 ? n : 150_000
})()

/**
 * When a caller sets no give-up point: no new attempt starts later than this
 * after the call begins. The platform ceiling on this project is 300s (Vercel
 * runtime log, 2026-09-12); the margin leaves the route time to answer itself.
 */
const DEFAULT_GIVE_UP_MS = 280_000

/** A retry after a stall is started only when at least this much time is left. */
const MIN_STALL_RETRY_WINDOW_MS = 90_000

interface GenerateParams {
  system: string
  user: string
  maxTokens: number
  temperature: number
  userId?: string
  route: string
  configKey?: string
  promptVersionId?: string | null
  /**
   * Epoch-ms deadline for the whole call, when the caller runs inside a
   * serverless function with a hard ceiling. Used only to decide whether the
   * reasoning-budget retry below has room to run; nothing is aborted mid-flight.
   */
  deadlineAt?: number
  /**
   * Epoch-ms point after which no NEW attempt may start, and past which no
   * attempt may run (2026-09-12). A route that makes several model calls sets
   * one for all of them, so it can always answer with its own message before
   * the platform kills it. Defaults to 280s after this call starts.
   */
  giveUpAt?: number
}
interface GenerateResult {
  text: string
  inputTokens: number
  outputTokens: number
  /**
   * The model stopped because it ran out of token budget, not because it had
   * finished — so `text` is INCOMPLETE (2026-09-11).
   *
   * Found on resume extraction in production: the same CV read twice produced
   * 2,246 output tokens once and 7,847 the next time, against an 8,192 ceiling.
   * A reasoning model's thinking varies run to run and is billed against the
   * same budget, so a long think left the JSON cut off mid-object. The empty-
   * answer case below was already retried; a cut-off answer went straight
   * through and failed to parse downstream, with nothing saying why.
   *
   * Reported, not thrown. Callers decide: extraction turns it into a clear
   * "try again", while services with their own schema retry (the cover letter)
   * keep the chance that a second attempt comes back shorter — throwing here
   * would have taken that away from them.
   */
  truncated: boolean
  /** Which upstream served it, when the provider says (OpenRouter does). Logged. */
  served?: string | null
}

const INR_PER_USD = 84

/**
 * Read a rupees-per-1k-tokens rate from the environment.
 *
 * `Number(process.env.X ?? fallback)` was wrong and had been silently zeroing
 * every cost estimate since the rates were added: `??` falls back only on
 * null/undefined, and `.env.local` carries `AI_INR_PER_1K_INPUT=` — an EMPTY
 * STRING, which `??` passes straight through to `Number('')` === 0. Measured
 * 2026-09-04: all 52 rows in `ai_usage_log` carry `estimated_cost_inr = 0`
 * while their token counts are correct and non-zero, so the whole cost side of
 * the usage log was reading as free.
 *
 * A blank, absent, non-numeric or negative value therefore means "not
 * configured" and takes the fallback. Zero is not accepted as a deliberate
 * rate: no provider is free, and a real zero here is what hid this for weeks.
 */
function rateFromEnv(raw: string | undefined, fallbackUsdPer1k: number): number {
  const parsed = Number(raw?.trim())
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return fallbackUsdPer1k * INR_PER_USD
}

const DEFAULT_INR_PER_1K_INPUT = rateFromEnv(process.env.AI_INR_PER_1K_INPUT, 3 / 1000)
const DEFAULT_INR_PER_1K_OUTPUT = rateFromEnv(process.env.AI_INR_PER_1K_OUTPUT, 15 / 1000)

function estimateCostInr(inputTokens: number, outputTokens: number) {
  return Math.round(((inputTokens / 1000) * DEFAULT_INR_PER_1K_INPUT + (outputTokens / 1000) * DEFAULT_INR_PER_1K_OUTPUT) * 100) / 100
}

async function logUsage(userId: string | null, route: string, model: string, inputTokens: number, outputTokens: number, promptVersionId?: string | null) {
  try {
    const supabase = createServiceRoleClient()
    await supabase.from('ai_usage_log').insert({
      user_id: userId,
      route,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_inr: estimateCostInr(inputTokens, outputTokens),
      // Which prompt version produced this. NULL = the service ran on its
      // in-code prompt. This is what makes a change in output quality
      // attributable to the prompt rather than guessed at (migration 041).
      prompt_version_id: promptVersionId ?? null,
    })
  } catch (e) { console.error('ai_usage_log insert failed', e instanceof Error ? e.message : String(e)) }
}

/** How long the next attempt may wait: the stall timeout, but never past the give-up point. */
function attemptTimeout(giveUpAt: number): number {
  return Math.min(STALL_TIMEOUT_MS, giveUpAt - Date.now())
}

/**
 * fetch + JSON with a hard timeout. An abort — while waiting for headers OR
 * while reading the body — becomes a StallError, so a stalled upstream is told
 * apart from every other failure.
 */
async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  if (timeoutMs <= 0) throw new StallError('out of time before the attempt could start')
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal })
    const json = await res.json().catch((e) => {
      if (ctl.signal.aborted) throw e
      return null
    })
    return { res, json: json as any }
  } catch (e) {
    if (ctl.signal.aborted) {
      throw new StallError(`no answer within ${Math.round(timeoutMs / 1000)}s — the upstream stalled`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/**
 * One HTTP attempt at a given token budget. Split out of
 * callOpenAICompatible so that function can retry it with a larger budget
 * without duplicating the request/response handling.
 */
async function attemptOpenAICompatible(baseUrl: string, apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number, timeoutMs: number) {
  const { res, json } = await fetchJsonWithTimeout(
    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature }) },
    timeoutMs,
  )
  if (!res.ok) throw new AIProviderError(`${res.status}: ${json?.error?.message ?? res.statusText}`)
  const choice = json?.choices?.[0]
  const text = choice?.message?.content
  const reasoningChars = String(choice?.message?.reasoning ?? '').length
  return { text, choice, reasoningChars, usage: json?.usage, served: (json?.provider as string | undefined) ?? null }
}

async function callOpenAICompatible(baseUrl: string, apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number, deadlineAt: number | undefined, giveUpAt: number) {
  const firstStartedAt = Date.now()
  let attempt: Awaited<ReturnType<typeof attemptOpenAICompatible>>
  try {
    attempt = await attemptOpenAICompatible(baseUrl, apiKey, model, system, user, maxTokens, temperature, attemptTimeout(giveUpAt))
  } catch (e) {
    // STALL RETRY (2026-09-12). One more attempt, only when there is room for
    // a whole healthy answer. OpenRouter routes every request afresh — six
    // measured calls landed on four different upstreams — so a retry very
    // likely reaches one that is not stuck. Any other failure is not retried.
    if (!(e instanceof StallError) || giveUpAt - Date.now() < MIN_STALL_RETRY_WINDOW_MS) throw e
    console.warn(`ai stall: ${e.message} (${model}); retrying once on a fresh route`)
    attempt = await attemptOpenAICompatible(baseUrl, apiKey, model, system, user, maxTokens, temperature, attemptTimeout(giveUpAt))
  }

  // REASONING-BUDGET RETRY (found while diagnosing "optimize with a job
  // description fails, without one it works" — 2026-08-18). Reasoning models
  // (deepseek-v4-flash, the configured default, confirmed live in
  // ai_provider_config with no fallback set) spend their thinking tokens
  // against the SAME max_tokens budget before emitting any visible content.
  // A longer, more complex prompt — exactly what adding a job description and
  // its Job Match Findings section produces on this route
  // (lib/ai/buildOptimizationPrompt.ts) — makes the model reason for longer,
  // so it is disproportionately likely to exhaust the budget before writing
  // any JSON at all. That failure was previously terminal: one silent
  // "no content" error, no retry, whatever the caller's fixed maxTokens was.
  // One retry at roughly double the budget (capped, so a runaway prompt can't
  // silently balloon cost) gives the SAME request room to finish reasoning
  // and still emit its answer, rather than failing the whole optimization.
  if (!attempt.text && attempt.reasoningChars > 0) {
    const retryBudget = Math.min(maxTokens * 2, 16384)

    // ONLY RETRY IF THERE IS TIME TO FINISH IT.
    //
    // The retry doubles the token budget, so it takes AT LEAST as long as the
    // attempt that just failed and usually longer. Inside a serverless function
    // with a hard ceiling that turns a recoverable failure into a timeout:
    // measured 2026-09-05, the optimization call alone runs 18.4s locally and
    // roughly twice that on Vercel. Retrying there guarantees a
    // 504 FUNCTION_INVOCATION_TIMEOUT — the user sees a bare server error and
    // TWO model calls have been paid for.
    //
    // Refusing the retry instead surfaces the real reason through the error
    // below, costs one call rather than two, and lets the route answer with
    // something a person can act on. A caller that sets no deadline (a script,
    // a longer-limit environment) keeps the old unconditional behaviour —
    // still bounded by the give-up point.
    const firstAttemptMs = Date.now() - firstStartedAt
    const roomForRetry =
      (deadlineAt === undefined || Date.now() + firstAttemptMs * 1.5 < deadlineAt) &&
      giveUpAt - Date.now() >= MIN_STALL_RETRY_WINDOW_MS

    if (retryBudget > maxTokens && roomForRetry) {
      attempt = await attemptOpenAICompatible(baseUrl, apiKey, model, system, user, retryBudget, temperature, attemptTimeout(giveUpAt))
    } else if (retryBudget > maxTokens) {
      console.warn(
        `ai retry skipped: first attempt took ${(firstAttemptMs / 1000).toFixed(1)}s and a doubled-budget ` +
          `retry would not finish before the function deadline`,
      )
    }
  }

  const { text, choice, reasoningChars, usage, served } = attempt
  if (!text) {
    // Reasoning models (deepseek-v4-flash, the configured default) spend their
    // thinking tokens against the SAME max_tokens budget before emitting any
    // visible content, so an under-budgeted call returns a populated
    // `reasoning` field and a null `content`. That is a completely different
    // problem from a refusal or a bad key, and the bare old message
    // ("no text content") sent every diagnosis down the wrong path.
    throw new AIProviderError(
      `Model returned no content (finish_reason=${choice?.finish_reason ?? 'unknown'}` +
        (reasoningChars
          ? `, reasoning-only response of ${reasoningChars} chars — max_tokens was likely consumed by reasoning tokens`
          : '') +
        ')'
    )
  }
  return {
    text,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    // Content arrived, but the budget ran out before the model finished it.
    truncated: choice?.finish_reason === 'length',
    served,
  }
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number, giveUpAt: number) {
  const { res, json } = await fetchJsonWithTimeout(
    'https://api.anthropic.com/v1/messages',
    { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'false' }, body: JSON.stringify({ model, system, messages: [{ role: 'user', content: user }], max_tokens: maxTokens, temperature }) },
    attemptTimeout(giveUpAt),
  )
  if (!res.ok) throw new AIProviderError(`${res.status}: ${json?.error?.message ?? res.statusText}`)
  const text = (json?.content ?? []).filter((x: any) => x?.type === 'text').map((x: any) => x.text).join('')
  if (!text) throw new AIProviderError('Model response contained no text content')
  return {
    text,
    inputTokens: json?.usage?.input_tokens ?? 0,
    outputTokens: json?.usage?.output_tokens ?? 0,
    truncated: json?.stop_reason === 'max_tokens',
    served: 'anthropic',
  }
}

async function callProvider(provider: string, apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number, deadlineAt: number | undefined, giveUpAt: number) {
  const p = provider.toLowerCase()
  if (p === 'anthropic') return callAnthropic(apiKey, model, system, user, maxTokens, temperature, giveUpAt)
  if (p === 'openrouter') return callOpenAICompatible('https://openrouter.ai/api/v1', apiKey, model, system, user, maxTokens, temperature, deadlineAt, giveUpAt)
  if (p === 'openai') return callOpenAICompatible('https://api.openai.com/v1', apiKey, model, system, user, maxTokens, temperature, deadlineAt, giveUpAt)
  if (p === 'google') return callOpenAICompatible('https://generativelanguage.googleapis.com/v1beta/openai', apiKey, model, system, user, maxTokens, temperature, deadlineAt, giveUpAt)
  if (p === 'mistral') return callOpenAICompatible('https://api.mistral.ai/v1', apiKey, model, system, user, maxTokens, temperature, deadlineAt, giveUpAt)
  throw new AIProviderError(`Unsupported AI provider: ${provider}`)
}

/**
 * THREE RUNTIME TIERS: this service's provider, this service's fallback, then the
 * `default` row as a last resort (founder request 2026-08-17).
 *
 * The third tier did not exist before. The `default` row was only ever a
 * CONFIGURATION fallback — used when a service had no row of its own, decided
 * before any call — so a service whose own primary and fallback both failed
 * mid-call simply failed, even with a perfectly healthy default configured.
 *
 * THE GUARD THAT MATTERS: each tier is skipped when it names the same
 * provider-and-model as one already attempted. Without it, a service with no row
 * of its own resolves TO the default row, and the last resort would re-run the
 * identical failing call — paying twice for one failure and making the user wait
 * through two timeouts for the same error message.
 */
export async function generate({ system, user, maxTokens, temperature, userId, route, configKey, promptVersionId, deadlineAt, giveUpAt }: GenerateParams): Promise<GenerateResult> {
  const config = await getProviderConfig(configKey)
  if (!config) throw new AIProviderError('AI provider is not configured. Set it in /admin first.')
  const giveUp = giveUpAt ?? Date.now() + DEFAULT_GIVE_UP_MS

  interface Tier { label: string; provider: string; apiKey: string; model: string }
  const tiers: Tier[] = [{ label: 'primary', provider: config.provider, apiKey: config.apiKey, model: config.model }]

  // Fallback needs all three of provider, model and key. A fallback model on its
  // own does nothing — the admin screen says so, because it is otherwise silent.
  if (config.fallbackProvider && config.fallbackModel && config.fallbackApiKey) {
    tiers.push({ label: 'fallback', provider: config.fallbackProvider, apiKey: config.fallbackApiKey, model: config.fallbackModel })
  }

  // Last resort: the default row, read EXACTLY (never re-resolved through the
  // key, which would just hand back the same config again).
  if (configKey && configKey !== AI_CONFIG_KEY_DEFAULT) {
    const fallbackDefault = await getProviderConfigExact(AI_CONFIG_KEY_DEFAULT)
    if (fallbackDefault) {
      tiers.push({ label: 'default', provider: fallbackDefault.provider, apiKey: fallbackDefault.apiKey, model: fallbackDefault.model })
    }
  }

  const attempted = new Set<string>()
  const failures: string[] = []

  for (const tier of tiers) {
    const signature = `${tier.provider.toLowerCase()}/${tier.model}`
    if (attempted.has(signature)) continue
    attempted.add(signature)
    // No tier starts once the give-up point has passed: the route answers
    // with its own error rather than the platform's timeout page.
    if (Date.now() >= giveUp) {
      failures.push(`${tier.label} (${signature}): skipped — out of time`)
      continue
    }

    const startedAt = Date.now()
    try {
      const result = await callProvider(tier.provider, tier.apiKey, tier.model, system, user, maxTokens, temperature, deadlineAt, giveUp)
      // DURATION MATTERS NOW. Without a per-call duration there is no way to
      // tell which call in a multi-call route is the expensive one, which is
      // exactly the question a timeout raises. And WHICH UPSTREAM served it
      // (2026-09-12): OpenRouter spreads one model across many providers, and a
      // slow build can only be pinned to one of them if the log says which.
      // Logged rather than stored: an operational signal, not a business record.
      console.log(
        `ai ${route} ${tier.provider}/${tier.model}${result.served ? ` via ${result.served}` : ''} ` +
          `${((Date.now() - startedAt) / 1000).toFixed(1)}s ` +
          `in=${result.inputTokens} out=${result.outputTokens} budget=${maxTokens}` +
          (result.truncated ? ' TRUNCATED (hit the token budget before finishing)' : ''),
      )
      // Logged whether or not it was cut off: a truncated answer was still paid for.
      void logUsage(userId ?? null, route, tier.model, result.inputTokens, result.outputTokens, promptVersionId)
      return result
    } catch (e) {
      // Carry the real reason INTO the message. It was once passed only as
      // `cause`, which nothing logs, so every failure surfaced as the same
      // uninformative sentence and the actual provider error was unrecoverable.
      failures.push(`${tier.label} (${signature}): ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  throw new AIProviderError(
    tiers.length === 1
      ? `AI provider failed and no fallback is configured — ${failures.join('; ')}`
      : `Every configured AI provider failed — ${failures.join('; ')}`,
  )
}
