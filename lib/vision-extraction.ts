import Anthropic from '@anthropic-ai/sdk';
import { calculateCostUsd } from '@/lib/agents/api-cost';

// Transcription is a structured lookup task — Haiku handles it at 20× lower cost than Sonnet.
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Anthropic document block supports PDFs up to 32 MB and 100 pages.
// We stay conservative at 20 MB to match the upload limit in the extract route.
const MAX_VISION_PDF_BYTES = 20 * 1024 * 1024;

export type VisionUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
};

export async function extractTextViaVision(
  buffer: Buffer,
): Promise<{ text: string; usage: VisionUsage }> {
  if (buffer.length > MAX_VISION_PDF_BYTES) {
    throw new Error(
      `PDF is too large for vision extraction (${(buffer.length / 1024 / 1024).toFixed(1)} MB). ` +
        `Please upload a file under 20 MB.`,
    );
  }

  const client = new Anthropic();
  const base64 = buffer.toString('base64');

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: 'Transcribe all text from this contract document exactly as it appears. Include every heading, clause number, definition, date, party name, monetary amount, and signature block. Preserve paragraph structure with line breaks. Do not summarise, paraphrase, or omit any content. Return only the transcribed text with no commentary.',
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  );
  if (!textBlock) {
    throw new Error('Vision extraction returned no text content.');
  }

  const u = response.usage;
  const cacheCreation = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;

  const usage: VisionUsage = {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheCreationTokens: cacheCreation,
    cacheReadTokens: cacheRead,
    costUsd: calculateCostUsd(HAIKU_MODEL, {
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_creation_input_tokens: cacheCreation,
      cache_read_input_tokens: cacheRead,
    }),
  };

  return { text: textBlock.text.trim(), usage };
}
