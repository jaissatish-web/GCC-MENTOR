import Anthropic from '@anthropic-ai/sdk'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

// Every model call in this product goes through generate() below.
// No API route may import the Anthropic SDK directly (docs/TASKS.md TASK-015).

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

const MODEL_NAME = 'claude-sonnet-5';

// ---- ai_usage_log (TASK-039) ----------------------------------------------
// TASK-039 moves unit-cost logging INSIDE the provider so no route can forget
// to log. generate() writes one row to ai_usage_log on every successful call.
//
// This uses the SERVICE-ROLE client (server-only, bypasses RLS). As of this
// commit, migration 015 also restricts ai_usage_log's SELECT/INSERT grants
// to service_role only (matching pii_access_log's model) — cost data is
// internal business information with no end-user use case, so the original
// owner-readable RLS from migration 013 was tightened rather than relied on
// as-is. provider.ts is server-only by construction (it holds
// ANTHROPIC_API_KEY), consistent with docs/RULES.md §6.
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
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('ai_usage_log').insert({
      user_id: opts.userId,
      route: opts.route,
      model: MODEL_NAME,
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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function generate({
  system,
  user,
  maxTokens,
  temperature,
  userId,
  route,
}: GenerateParams): Promise<GenerateResult> {
  try {
    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new AIProviderError('Model response contained no text block');
    }

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    // Fire-and-forget the usage log so it never slows or blocks the response.
    void logUsage({ userId, route, inputTokens, outputTokens });

    return {
      text: textBlock.text,
      inputTokens,
      outputTokens,
    };
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    throw new AIProviderError('AI provider call failed', error);
  }
}