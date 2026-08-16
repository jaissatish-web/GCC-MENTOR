import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { getProviderConfig } from '@/lib/ai/providerConfig'

export class AIProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); this.name = 'AIProviderError' }
}

interface GenerateParams { system: string; user: string; maxTokens: number; temperature: number; userId?: string; route: string; configKey?: string }
interface GenerateResult { text: string; inputTokens: number; outputTokens: number }

const INR_PER_USD = 84
const DEFAULT_INR_PER_1K_INPUT = Number(process.env.AI_INR_PER_1K_INPUT ?? (3 / 1000) * INR_PER_USD)
const DEFAULT_INR_PER_1K_OUTPUT = Number(process.env.AI_INR_PER_1K_OUTPUT ?? (15 / 1000) * INR_PER_USD)

function estimateCostInr(inputTokens: number, outputTokens: number) {
  return Math.round(((inputTokens / 1000) * DEFAULT_INR_PER_1K_INPUT + (outputTokens / 1000) * DEFAULT_INR_PER_1K_OUTPUT) * 100) / 100
}

async function logUsage(userId: string | null, route: string, model: string, inputTokens: number, outputTokens: number) {
  try {
    const supabase = createServiceRoleClient()
    await supabase.from('ai_usage_log').insert({ user_id: userId, route, model, input_tokens: inputTokens, output_tokens: outputTokens, estimated_cost_inr: estimateCostInr(inputTokens, outputTokens) })
  } catch (e) { console.error('ai_usage_log insert failed', e instanceof Error ? e.message : String(e)) }
}

async function callOpenAICompatible(baseUrl: string, apiKey: string, model: string, system: string, user: string, maxTokens: number, temperature: number) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature }) })
  const json = await res.json().catch(() => null) as any
  if (!res.ok) throw new AIProviderError(`${res.status}: ${json?.error?.message ?? res.statusText}`)
  const choice = json?.choices?.[0]
  const text = choice?.message?.content
  if (!text) {
    // Reasoning models (deepseek-v4-flash, the configured default) spend their
    // thinking tokens against the SAME max_tokens budget before emitting any
    // visible content, so an under-budgeted call returns a populated
    // `reasoning` field and a null `content`. That is a completely different
    // problem from a refusal or a bad key, and the bare old message
    // ("no text content") sent every diagnosis down the wrong path.
    const reasoningChars = String(choice?.message?.reasoning ?? '').length
    throw new AIProviderError(
      `Model returned no content (finish_reason=${choice?.finish_reason ?? 'unknown'}` +
        (reasoningChars
          ? `, reasoning-only response of ${reasoningChars} chars — max_tokens was likely consumed by reasoning tokens`
          : '') +
        ')'
    )
  }
  return { text, inputTokens: json?.usage?.prompt_tokens ?? 0, outputTokens: json?.usage?.completion_tokens ?? 0 }
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

export async function generate({ system, user, maxTokens, temperature, userId, route, configKey }: GenerateParams): Promise<GenerateResult> {
  const config = await getProviderConfig(configKey)
  if (!config) throw new AIProviderError('AI provider is not configured. Set it in /admin first.')

  try {
    const result = await callProvider(config.provider, config.apiKey, config.model, system, user, maxTokens, temperature)
    void logUsage(userId ?? null, route, config.model, result.inputTokens, result.outputTokens)
    return result
  } catch (primaryError) {
    // Carry the real reason INTO the message. It was previously passed only as
    // `cause`, which nothing logs, so every failure surfaced as the same
    // uninformative sentence and the actual provider error was unrecoverable.
    const why = primaryError instanceof Error ? primaryError.message : String(primaryError)
    if (!config.fallbackProvider || !config.fallbackModel || !config.fallbackApiKey) {
      throw new AIProviderError(
        `Primary AI provider (${config.provider}/${config.model}) failed and no fallback is configured — ${why}`,
        primaryError
      )
    }
    try {
      const result = await callProvider(config.fallbackProvider, config.fallbackApiKey, config.fallbackModel, system, user, maxTokens, temperature)
      void logUsage(userId ?? null, route, config.fallbackModel, result.inputTokens, result.outputTokens)
      return result
    } catch (fallbackError) {
      throw new AIProviderError('Both primary and fallback AI providers failed', { primaryError, fallbackError })
    }
  }
}
