import { hasServiceRole, supabaseAdminFetch } from '@/lib/supabase-auth';

const WINDOW_MS = 60_000; // 1-minute sliding window

// Fallback store, used only when Supabase isn't configured (local dev) or is
// temporarily unreachable. Per-instance and short-lived — see evaluateWindow's
// note on why that's not enough on its own, which is exactly why we persist to
// Supabase when we can.
const fallbackBuckets = new Map<string, number[]>();

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  );
}

// The sliding-window decision, kept pure so it's easy to read and unit-test.
// Given the timestamps we've already seen for an IP, `now`, and the limit, it
// returns whether this request is allowed and the timestamp list to store back
// (old entries outside the window are dropped; an allowed request is appended).
export function evaluateWindow(
  timestamps: number[],
  now: number,
  limit: number,
): { allowed: boolean; retryAfter: number; nextTimestamps: number[] } {
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= limit) {
    const retryAfter = Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter, nextTimestamps: recent };
  }

  return { allowed: true, retryAfter: 0, nextTimestamps: [...recent, now] };
}

let loggedStorageError = false;

function logStorageErrorOnce(error: unknown) {
  if (loggedStorageError) return;
  loggedStorageError = true;
  console.error(
    '[rate-limit] Supabase storage unavailable — falling back to per-instance ' +
      'in-memory counters. Rate limits are NOT enforced across instances until ' +
      'this is resolved.',
    error,
  );
}

// Reads the stored timestamps for an IP. Prefers the durable Supabase table;
// falls back to the in-memory Map if Supabase isn't configured or errors.
async function readBucket(ip: string): Promise<number[]> {
  if (!hasServiceRole()) {
    return fallbackBuckets.get(ip) ?? [];
  }

  try {
    const response = await supabaseAdminFetch(
      `/rest/v1/rate_limits?bucket_key=eq.${encodeURIComponent(ip)}&select=hits`,
    );
    if (!response.ok) throw new Error(`read failed: ${response.status}`);
    const rows = (await response.json()) as Array<{ hits: number[] }>;
    return Array.isArray(rows[0]?.hits) ? rows[0].hits : [];
  } catch (error) {
    logStorageErrorOnce(error);
    return fallbackBuckets.get(ip) ?? [];
  }
}

// Persists the updated timestamps for an IP (upsert on the bucket_key PK).
async function writeBucket(ip: string, timestamps: number[]): Promise<void> {
  if (!hasServiceRole()) {
    fallbackBuckets.set(ip, timestamps);
    return;
  }

  try {
    const response = await supabaseAdminFetch('/rest/v1/rate_limits', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        bucket_key: ip,
        hits: timestamps,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error(`write failed: ${response.status}`);
  } catch (error) {
    logStorageErrorOnce(error);
    fallbackBuckets.set(ip, timestamps);
  }
}

// Note: read-modify-write is not atomic, so two requests for the same IP
// arriving simultaneously can both read the same list and both be allowed — a
// slight over-count under exact concurrency. That's acceptable for spam
// throttling; tightening it would require a DB-side counter.
export async function checkRateLimit(
  ip: string,
  limit: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = Date.now();
  const stored = await readBucket(ip);
  const { allowed, retryAfter, nextTimestamps } = evaluateWindow(stored, now, limit);
  await writeBucket(ip, nextTimestamps);
  return { allowed, retryAfter };
}
