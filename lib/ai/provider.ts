import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { getProviderConfig, getProviderConfigExact, AI_CONFIG_KEY_DEFAULT } from '@/lib/ai/providerConfig'

export class AIProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); this.name = 'AIProviderError' }
}

interface GenerateParams { system: string; user: string; maxTokens: number; temperature: number; userId?: string; route: string; configKey?: string; promptVersionId?: string | null }
interface GenerateResult { text: string; inputTokens: number; outputTokens: number }

const INR_PER_USD = 84
const DEFAULT_INR_PER_1K_INPUT = Number(process.env.AI_INR_PER_1K_INPUT ?? (3 / 1000) * INR_PER_USD)
const DEFAULT_INR_PER_1K_OUTPUT = Number(process.env.AI_INR_PER_1K_OUTPUT ?? (15 / 1000) * INR_PER_USD)

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

/**
 * One HTTP attempt at a given token budget. Split out of
 * callOpenAICompatible so that function can retry it with a larger budget
 * without duplicating the request/response handling.
 */
async function attemptOpenAICompatible(baseUrl: string, apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature }) })
  const json = await res.json().catch(() => null) as any
  if (!res.ok) throw new AIProviderError(`${res.status}: ${json?.error?.message ?? res.statusText}`)
  const choice = json?.choices?.[0]
  const text = choice?.message?.content
  const reasoningChars = String(choice?.message?.reasoning ?? '').length
  return { text, choice, reasoningChars, usage: json?.usage }
}

async function callOpenAICompatible(baseUrl: string, apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number) {
  let attempt = await attemptOpenAICompatible(baseUrl, apiKey, model, system, user, maxTokens, temperature)

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
    if (retryBudget > maxTokens) {
      attempt = await attemptOpenAICompatible(baseUrl, apiKey, model, system, user, retryBudget, temperature)
    }
  }

  const { text, choice, reasoningChars, usage } = attempt
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
  return { text, inputTokens: usage?.prompt_tokens ?? 0, outputTokens: usage?.completion_tokens ?? 0 }
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number) {
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'false' }, body: JSON.stringify({ model, system, messages: [{ role: 'user', content: user }], max_tokens: maxTokens, temperature }) })
  const json = await res.json().catch(() => null) as any
  if (!res.ok) throw new AIProviderError(`${res.status}: ${json?.error?.message ?? res.statusText}`)
  const text = (json?.content ?? []).filter((x: any) => x?.type === 'text').map((x: any) => x.text).join('')
  if (!text) throw new AIProviderError('Model response contained no text content')
  return { text, inputTokens: json?.usage?.input_tokens ?? 0, outputTokens: json?.usage?.output_tokens ?? 0 }
}

async function callProvider(provider: string, apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number) {
  const p = provider.toLowerCase()
  if (p === 'anthropic') return callAnthropic(apiKey, model, system, user, maxTokens, temperature)
  if (p === 'openrouter') return callOpenAICompatible('https://openrouter.ai/api/v1', apiKey, model, system, user, maxTokens, temperature)
  if (p === 'openai') return callOpenAICompatible('https://api.openai.com/v1', apiKey, model, system, user, maxTokens, temperature)
  if (p === 'google') return callOpenAICompatible('https://generativelanguage.googleapis.com/v1beta/openai', apiKey, model, system, user, maxTokens, temperature)
  if (p === 'mistral') return callOpenAICompatible('https://api.mistral.ai/v1', apiKey, model, system, user, maxTokens, temperature)
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
export async function generate({ system, user, maxTokens, temperature, userId, route, configKey, promptVersionId }: GenerateParams): Promise<GenerateResult> {
  const config = await getProviderConfig(configKey)
  if (!config) throw new AIProviderError('AI provider is not configured. Set it in /admin first.')

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

    try {
      const result = await callProvider(tier.provider, tier.apiKey, tier.model, system, user, maxTokens, temperature)
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
