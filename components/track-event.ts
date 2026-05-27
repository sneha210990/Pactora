import { apiFetch } from '@/lib/api-fetch';

export async function trackEvent(event_type: string, page_context: string) {
  try {
    await apiFetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type, page_context }),
    });
  } catch {
    // non-blocking telemetry
  }
}
