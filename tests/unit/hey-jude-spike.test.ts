/**
 * Hey Jude integration spike — evaluates whether the hey-jude privacy gateway
 * (https://github.com/sure-scale/hey-jude) is compatible with the exact Anthropic
 * API features Pactora relies on.
 *
 * Skipped unless HEYJUDE_BASE_URL is set. Run hey-jude first:
 *   cd hey-jude && docker compose up --build
 *
 * Then run this file:
 *   HEYJUDE_BASE_URL=http://localhost:4005 pnpm test -- tests/unit/hey-jude-spike.test.ts
 */

import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { CLAUSE_AGENT_TOOLS } from '@/lib/agents/tools';

const HEYJUDE_BASE_URL = process.env.HEYJUDE_BASE_URL;
const HEYJUDE_API_KEY  = process.env.HEYJUDE_API_KEY ?? 'sk-heyjude-dev';

// Short contract excerpt with realistic PII so hey-jude has something to scrub:
// company names, address, signatory email — all things that must not reach Anthropic raw.
const SAMPLE_CONTRACT = `SAAS AGREEMENT

This Software as a Service Agreement ("Agreement") is entered into as of January 15, 2024,
by and between TechFlow Solutions Inc., a Delaware corporation ("Supplier"), with its
principal place of business at 450 Market Street, Suite 800, San Francisco, CA 94105
(contact: contracts@techflow.io), and Meridian Financial Ltd., a UK private limited
company ("Customer"), registered at 22 Bishopsgate, London, EC2N 4BQ, United Kingdom.

1. GOVERNING LAW
This Agreement and any dispute arising out of or in connection with it shall be governed
by and construed in accordance with the laws of the State of Delaware, excluding its
conflict-of-law provisions. The Supplier retains the right to seek injunctive relief in
any jurisdiction without posting bond.

2. INTELLECTUAL PROPERTY
All inventions, developments, software, and deliverables created by Supplier under this
Agreement shall remain the exclusive property of Supplier. Customer grants Supplier a
perpetual, irrevocable, royalty-free licence to use Customer's data, feedback, and usage
patterns to improve Supplier's products and services.

3. INDEMNIFICATION
Customer shall indemnify, defend, and hold harmless TechFlow Solutions Inc. and its
officers, directors, and employees from any and all claims, liabilities, damages, losses,
costs, and expenses (including reasonable attorneys' fees) arising out of or relating to
Customer's use of the Services or breach of this Agreement.

Signed: Sarah Chen, CEO — sarah.chen@techflow.io
`;

describe.skipIf(!HEYJUDE_BASE_URL)('hey-jude proxy spike', () => {
  const client = new Anthropic({
    baseURL: HEYJUDE_BASE_URL!,
    apiKey: HEYJUDE_API_KEY,
  });

  // ── Test 1: Haiku + tool_choice:'any' + cache_control ─────────────────────
  // Mirrors the exact call shape used for Governing Law / Auto-Renewal / etc.
  // Validates: basic proxy connectivity, tool forcing, cache header passthrough.
  it('Haiku — tool_choice any + cache_control passes through', async () => {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0,
      tools: CLAUSE_AGENT_TOOLS,
      tool_choice: { type: 'any' },
      system: [
        {
          type: 'text',
          text: `The following is the full text of a SaaS contract under review:\n\n${SAMPLE_CONTRACT}`,
          cache_control: { type: 'ephemeral' },
        },
        {
          type: 'text',
          text: 'You are a specialist clause agent reviewing the Governing Law clause. Identify any risks relating to jurisdiction choice, one-sided dispute resolution, or waiver of rights.',
        },
      ],
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Analyse the contract above for Governing Law risks and call the appropriate tool.' }],
        },
      ],
    });

    console.log('\n── Test 1: Haiku + tool_choice:any ──');
    console.log('stop_reason    :', response.stop_reason);
    console.log('usage          :', response.usage);
    console.log('content blocks :', response.content.map(b => b.type));

    const toolCall = response.content.find(b => b.type === 'tool_use');
    console.log('tool called    :', toolCall?.type === 'tool_use' ? toolCall.name : '(none)');
    if (toolCall?.type === 'tool_use') {
      console.log('tool input     :', JSON.stringify(toolCall.input, null, 2).slice(0, 400));
    }

    // Core requirement: must return a tool call (not raw text)
    expect(toolCall).toBeDefined();
    expect(toolCall?.type).toBe('tool_use');
    expect(['flag_clause', 'no_issue_found']).toContain((toolCall as Anthropic.ToolUseBlock).name);

    // cache_creation_input_tokens > 0 means cache_control header was passed through
    const cacheCreation = response.usage.cache_creation_input_tokens ?? 0;
    console.log('cache_creation_input_tokens:', cacheCreation, cacheCreation > 0 ? '✓ passed through' : '✗ stripped by proxy');
  }, 60_000);

  // ── Test 2: Sonnet + extended thinking + tool_choice:'auto' ───────────────
  // Mirrors the exact call shape used for IP Ownership and Indemnities agents.
  // Validates: thinking beta header passthrough, thinking blocks in response.
  it('Sonnet — extended thinking passes through', async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      thinking: { type: 'enabled' as const, budget_tokens: 2000 },
      tools: CLAUSE_AGENT_TOOLS,
      tool_choice: { type: 'auto' },
      system: [
        {
          type: 'text',
          text: `The following is the full text of a SaaS contract under review:\n\n${SAMPLE_CONTRACT}`,
          cache_control: { type: 'ephemeral' },
        },
        {
          type: 'text',
          text: 'You are a specialist clause agent reviewing IP Ownership. Identify clauses where the vendor claims rights over customer data, feedback, or derived works.',
        },
      ],
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Analyse the contract above for IP Ownership risks and call the appropriate tool.' }],
        },
      ],
    });

    console.log('\n── Test 2: Sonnet + extended thinking ──');
    console.log('stop_reason    :', response.stop_reason);
    console.log('usage          :', response.usage);
    console.log('content blocks :', response.content.map(b => b.type));

    const thinkingBlock = response.content.find(b => b.type === 'thinking');
    const toolCall      = response.content.find(b => b.type === 'tool_use');

    console.log('thinking block :', thinkingBlock ? '✓ present' : '✗ absent');
    console.log('tool called    :', toolCall?.type === 'tool_use' ? toolCall.name : '(none)');

    // Extended thinking must produce at least one thinking block
    expect(thinkingBlock).toBeDefined();
    expect(thinkingBlock?.type).toBe('thinking');

    // Tool call should still be present (thinking + tool use together)
    if (toolCall) {
      expect(toolCall.type).toBe('tool_use');
      expect(['flag_clause', 'no_issue_found']).toContain((toolCall as Anthropic.ToolUseBlock).name);
    }
  }, 120_000);
});
