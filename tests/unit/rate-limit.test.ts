import { describe, expect, it } from 'vitest';
import { evaluateWindow } from '../../lib/rate-limit';

// evaluateWindow is the pure sliding-window decision (60s window). All the
// Supabase/in-memory storage around it is I/O; the logic under test is here.
const NOW = 1_000_000;

describe('evaluateWindow', () => {
  it('allows a request when under the limit and appends the timestamp', () => {
    const result = evaluateWindow([NOW - 5_000], NOW, 10);
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBe(0);
    expect(result.nextTimestamps).toEqual([NOW - 5_000, NOW]);
  });

  it('allows the first ever request', () => {
    const result = evaluateWindow([], NOW, 10);
    expect(result.allowed).toBe(true);
    expect(result.nextTimestamps).toEqual([NOW]);
  });

  it('blocks when the window is already full and does not append', () => {
    // 10 hits all inside the window (none at NOW), limit 10 → blocked, and NOW
    // must not be appended.
    const timestamps = Array.from({ length: 10 }, (_, i) => NOW - (i + 1) * 1_000);
    const result = evaluateWindow(timestamps, NOW, 10);
    expect(result.allowed).toBe(false);
    expect(result.nextTimestamps).toHaveLength(10);
    expect(result.nextTimestamps).not.toContain(NOW);
  });

  it('reports retryAfter as seconds until the oldest in-window hit expires', () => {
    // Oldest hit is 50s old → it leaves the 60s window in 10s.
    const oldest = NOW - 50_000;
    const timestamps = [oldest, ...Array.from({ length: 9 }, (_, i) => NOW - i * 1_000)];
    const result = evaluateWindow(timestamps, NOW, 10);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(10);
  });

  it('drops timestamps older than the window before counting', () => {
    // Nine of these are stale (>60s old); only one is recent, so far under limit.
    const stale = Array.from({ length: 9 }, (_, i) => NOW - 61_000 - i * 1_000);
    const result = evaluateWindow([...stale, NOW - 1_000], NOW, 10);
    expect(result.allowed).toBe(true);
    expect(result.nextTimestamps).toEqual([NOW - 1_000, NOW]);
  });
});
