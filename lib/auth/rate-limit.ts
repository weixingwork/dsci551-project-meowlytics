const attemptsByKey = new Map<string, number[]>();

function nowMs(): number {
  return Date.now();
}

function getWindowedAttempts(key: string, windowMs: number): number[] {
  const now = nowMs();
  const existing = attemptsByKey.get(key) ?? [];
  const kept = existing.filter((timestamp) => now - timestamp <= windowMs);
  attemptsByKey.set(key, kept);
  return kept;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; retryAfterSeconds: number } {
  const attempts = getWindowedAttempts(key, windowMs);
  if (attempts.length < limit) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  const oldest = attempts[0];
  const retryAfterMs = Math.max(0, windowMs - (nowMs() - oldest));
  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
}

export function recordFailedAttempt(key: string, windowMs: number): void {
  const attempts = getWindowedAttempts(key, windowMs);
  attempts.push(nowMs());
  attemptsByKey.set(key, attempts);
}

export function clearAttempts(key: string): void {
  attemptsByKey.delete(key);
}
