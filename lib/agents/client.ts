import Anthropic from '@anthropic-ai/sdk';

// Singleton — avoids creating a new TCP connection for every parallel clause agent.
let _client: Anthropic | null = null;

export function getAnthropicClient(baseURL?: string): Anthropic {
  if (baseURL) {
    return new Anthropic({ baseURL, apiKey: process.env.HEYJUDE_API_KEY ?? 'sk-heyjude-dev' });
  }
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

// Returns null when managed-agent env vars are not yet configured.
// Fill ANTHROPIC_AGENT_ID + ANTHROPIC_ENVIRONMENT_ID in .env.local
// after provisioning via the Anthropic console to unlock session-based
// durable execution (beta.sessions API).
export function getManagedAgentConfig(): { agentId: string; environmentId: string } | null {
  const agentId = process.env.ANTHROPIC_AGENT_ID;
  const environmentId = process.env.ANTHROPIC_ENVIRONMENT_ID;
  if (!agentId || !environmentId) return null;
  return { agentId, environmentId };
}
