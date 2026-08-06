import Anthropic from '@anthropic-ai/sdk';

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
}

interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generate({
  system,
  user,
  maxTokens,
  temperature,
}: GenerateParams): Promise<GenerateResult> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new AIProviderError('Model response contained no text block');
    }

    return {
      text: textBlock.text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    throw new AIProviderError('AI provider call failed', error);
  }
}
