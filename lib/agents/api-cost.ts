// Anthropic model pricing (USD per million tokens), correct as of 2025-05.
// Cache write is billed at 1.25× the base input price.
// Cache read is billed at 0.10× the base input price.
// Update these constants when Anthropic revises pricing.
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00,  cacheWrite: 1.00,  cacheRead: 0.08 },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00, cacheWrite: 3.75,  cacheRead: 0.30 },
};

const FALLBACK = PRICING['claude-sonnet-4-6'];

export type ModelUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

export function calculateCostUsd(model: string, usage: ModelUsage): number {
  const p = PRICING[model] ?? FALLBACK;
  const M = 1_000_000;
  return (
    (usage.input_tokens / M) * p.input +
    (usage.output_tokens / M) * p.output +
    (usage.cache_creation_input_tokens / M) * p.cacheWrite +
    (usage.cache_read_input_tokens / M) * p.cacheRead
  );
}
