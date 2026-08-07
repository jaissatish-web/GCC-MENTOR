import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { getProviderConfig } from '@/lib/ai/providerConfig'

// Every model call in this product goes through generate() below.
// No API route may call an AI provider directly (docs/TASKS.md TASK-015).
//
// PROVIDER SWITCH (founder request, 2026-08-07, docs/TASKS.md "Unplanned"):
// this used to call the Anthropic SDK directly with a hard-coded model and
// an env-var key. It now calls OpenRouter's OpenAI-compatible chat
// completions endpoint (plain fetch, no new dependency — OpenRouter's API
// needs nothing the Anthropic SDK gave us) using provider/model/key read
// live from ai_provider_config (migration 019, editable from /admin). The
// founder wanted to change model or key from the admin panel without a
// redeploy, and OpenRouter's own `models` + `route: 'fallback'` retry
// feature covers the "fall back to a different model" want for v2 without
// custom fallback logic here — fallback_model is wired through now, unused
// until the founder sets one.
//
// No hard-coded model/key ANYWHERE in this file — see AI_PROVIDER_ERROR
// below for what happens when ai_provider_config has no row yet.

export class AIProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}

interface GenerateParams {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  /** The authenticated user this call is on behalf of (for ai_usage_log). */
  userId: string;
  /** Which endpoint/flow triggered the call (for ai_usage_log), e.g. '/api/parse/upload'. */
  route: string;
}

interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ---- ai_usage_log (TASK-039) ----------------------------------------------
// TASK-039 moves unit-cost logging INSIDE the provider so no route can forget
// to log. generate() writes one row to ai_usage_log on every successful call.
//
// This uses the SERVICE-ROLE client (server-only, bypasses RLS). As of this
// commit, migration 015 also restricts ai_usage_log's SELECT/INSERT grants
// to service_role only (matching pii_access_log's model) — cost data is
// internal business information with no end-user use case, so the original
// owner-readable RLS from migration 013 was tightened rather than relied on
// as-is. provider.ts is server-only by construction (it reads the provider
// API key via the service-role client), consistent with docs/RULES.md §6.
//
// COST RATE NOTE (CTO-verified 2026-08-06): no per-model INR price was
// pinned anywhere in docs/. Sourced from Anthropic's published pricing for
// claude-sonnet-5: introductory $2/$10 per million input/output tokens
// through 2026-08-31, standard $3/$15 per million thereafter. Using the
// STANDARD rate as the default since the introductory window expires within
// days of this commit and this product has not launched yet — it will run
// under standard pricing almost immediately. Converted at an approximate
// ₹84/USD; both the rate and the FX assumption are env-overridable and
// should be revisited once real production volume gives an actual figure.
const INR_PER_USD = 84;
const DEFAULT_INR_PER_1K_INPUT = Number(
  process.env.AI_INR_PER_1K_INPUT ?? (3 / 1000) * INR_PER_USD, // ₹0.252/1k input
);
const DEFAULT_INR_PER_1K_OUTPUT = Number(
  process.env.AI_INR_PER_1K_OUTPUT ?? (15 / 1000) * INR_PER_USD, // ₹1.26/1k output
);

function estimateCostInr(inputTokens: number, outputTokens: number): number {
  const inr =
    (inputTokens / 1000) * DEFAULT_INR_PER_1K_INPUT +
    (outputTokens / 1000) * DEFAULT_INR_PER_1K_OUTPUT;
  // Round to paise (2dp) — cost is an estimate, keep it small and comparable.
  return Math.round(inr * 100) / 100;
}

async function logUsage(opts: {
  userId: string;
  route: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('ai_usage_log').insert({
      user_id: opts.userId,
      route: opts.route,
      model: opts.model,
      input_tokens: opts.inputTokens,
      output_tokens: opts.outputTokens,
      estimated_cost_inr: estimateCostInr(opts.inputTokens, opts.outputTokens),
    });
    if (error) {
      // A usage-log failure must never fail the model call the user is waiting
      // on. Log it and move on — the generation result is what matters.
      console.error(
        'ai_usage_log insert error: user=' + opts.userId + ' route=' + opts.route,
        error?.message ?? '',
      );
    }
  } catch (e) {
    console.error(
      'ai_usage_log insert threw: user=' + opts.userId + ' route=' + opts.route,
      e instanceof Error ? e.message : String(e),
    );
  }
}

// OpenRouter's chat-completions response shape (OpenAI-compatible) — only the
// fields this file actually reads, not the full spec.
interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export async function generate({
  system,
  user,
  maxTokens,
  temperature,
  userId,
  route,
}: GenerateParams): Promise<GenerateResult> {
  const config = await getProviderConfig();
  if (!config) {
    // No guessed default — there is no safe default for a live API key.
    // The founder configures this once from /admin (migration 019).
    throw new AIProviderError('AI provider is not configured. Set it in /admin first.');
  }

  // OpenRouter's own fallback-routing feature (models[] + route: 'fallback')
  // covers "retry with a different model on failure" — no custom retry loop
  // needed here. Falls back to a single `model` field when no fallback_model
  // is set, which is the plain single-model request shape.
  const body: Record<string, unknown> = {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature,
  };
  if (config.fallbackModel) {
    body.models = [config.model, config.fallbackModel];
    body.route = 'fallback';
  } else {
    body.model = config.model;
  }

  try {
    const res = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        // Optional app-identification headers OpenRouter's docs recommend —
        // no functional effect on the response, safe to omit if wrong.
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': '[Product Name]',
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => null)) as OpenRouterResponse | null;

    if (!res.ok) {
      // Never log config.apiKey or the request body (it's in closure, not
      // referenced here) — only the provider's own error message, if any.
      throw new AIProviderError(
        `OpenRouter request failed (${res.status}): ${json?.error?.message ?? res.statusText}`
      );
    }

    const text = json?.choices?.[0]?.message?.content;
    if (!text) {
      throw new AIProviderError('Model response contained no text content');
    }

    const inputTokens = json?.usage?.prompt_tokens ?? 0;
    const outputTokens = json?.usage?.completion_tokens ?? 0;

    // Fire-and-forget the usage log so it never slows or blocks the response.
    void logUsage({ userId, route, model: config.model, inputTokens, outputTokens });

    return { text, inputTokens, outputTokens };
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    throw new AIProviderError('AI provider call failed', error);
  }
}