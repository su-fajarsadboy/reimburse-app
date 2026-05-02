import { describe, it, expect, beforeEach } from 'vitest';
import { getRateLimiter, NoOpRateLimiter } from '@/lib/services/rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('returns NoOp when Upstash env not set', () => {
    expect(getRateLimiter()).toBeInstanceOf(NoOpRateLimiter);
  });

  it('NoOp always allows', async () => {
    const r = new NoOpRateLimiter();
    const result = await r.check('any-key');
    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });
});
