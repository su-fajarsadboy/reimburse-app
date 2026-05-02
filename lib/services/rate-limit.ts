export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export class NoOpRateLimiter implements RateLimiter {
  async check(): Promise<RateLimitResult> {
    return { success: true, limit: 60, remaining: 60, resetSeconds: 60 };
  }
}

let warned = false;

export function getRateLimiter(): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      console.warn('[rate-limit] UPSTASH env not set — using NoOp limiter (allow all)');
      warned = true;
    }
    return new NoOpRateLimiter();
  }
  return makeUpstashLimiter(url, token);
}

function makeUpstashLimiter(url: string, token: string): RateLimiter {
  // Lazy require to avoid pulling Upstash deps in test env
  const { Ratelimit } = require('@upstash/ratelimit') as typeof import('@upstash/ratelimit');
  const { Redis } = require('@upstash/redis') as typeof import('@upstash/redis');
  const redis = new Redis({ url, token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: false,
    prefix: 'reimb:rl',
  });

  return {
    async check(key: string) {
      const r = await limiter.limit(key);
      return {
        success: r.success,
        limit: r.limit,
        remaining: r.remaining,
        resetSeconds: Math.max(0, Math.ceil((r.reset - Date.now()) / 1000)),
      };
    },
  };
}
