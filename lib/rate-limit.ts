const WINDOW_MS = 60_000; // 1-minute sliding window

// Per-IP timestamp buckets. In-memory is sufficient for Vercel serverless as
// a stopgap — each function instance is short-lived and this prevents burst
// abuse within a single warm instance. Replace with Upstash Redis for
// cross-instance enforcement when traffic warrants it.
const buckets = new Map<string, number[]>();

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  );
}

export function checkRateLimit(
  ip: string,
  limit: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const timestamps = (buckets.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= limit) {
    const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
    buckets.set(ip, timestamps);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  buckets.set(ip, timestamps);
  return { allowed: true, retryAfter: 0 };
}
