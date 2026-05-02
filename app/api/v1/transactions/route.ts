import { NextRequest, NextResponse } from 'next/server';
import { requireBearer } from '@/lib/auth/api-key';
import { TransactionInput } from '@/lib/validation/transaction';
import { insertTransaction } from '@/lib/services/transactions';
import { checkIdempotency } from '@/lib/services/idempotency';
import { getRateLimiter } from '@/lib/services/rate-limit';
import { logRequest, extractRequestMeta } from '@/lib/services/audit';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';
import { getAdminClient } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let apiKeyId: string | null = null;
  let statusCode = 500;
  const meta = extractRequestMeta(req);

  try {
    const response = await withErrorBoundary(async () => {
      const auth = await requireBearer(req);
      apiKeyId = auth.apiKeyId;

      const limiter = getRateLimiter();
      const rl = await limiter.check(auth.apiKeyId);
      if (!rl.success) {
        const e = new ApiError('RATE_LIMITED', 429, 'Rate limit terlampaui');
        throw e;
      }

      const idemKey = req.headers.get('idempotency-key') ?? '';
      const body = await req.json();

      const idem = await checkIdempotency({ key: idemKey, apiKeyId: auth.apiKeyId, body });
      if (idem.kind === 'replay') {
        statusCode = idem.statusCode;
        return NextResponse.json(idem.response as Record<string, unknown>, {
          status: idem.statusCode,
          headers: { 'idempotent-replay': 'true' },
        });
      }

      const parsed = TransactionInput.parse(body);
      const result = await insertTransaction({
        tripId: auth.tripId,
        data: parsed,
        submitter: { kind: 'agent' },
      });
      const responseBody = ok(result);
      statusCode = 201;
      await idem.save(responseBody, 201);
      return NextResponse.json(responseBody, { status: 201 });
    })();

    if (response instanceof NextResponse) statusCode = response.status;
    return response;
  } finally {
    logRequest({
      apiKeyId,
      endpoint: '/api/v1/transactions',
      method: 'POST',
      statusCode,
      ip: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => {});
  }
}

export async function GET(req: NextRequest) {
  let apiKeyId: string | null = null;
  let statusCode = 500;
  const meta = extractRequestMeta(req);
  try {
    const response = await withErrorBoundary(async () => {
      const auth = await requireBearer(req);
      apiKeyId = auth.apiKeyId;

      const limiter = getRateLimiter();
      const rl = await limiter.check(auth.apiKeyId);
      if (!rl.success) throw new ApiError('RATE_LIMITED', 429, 'Rate limit terlampaui');

      const url = new URL(req.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 200);
      const cursor = url.searchParams.get('cursor');

      const sb = getAdminClient();
      let q = sb.from('transactions')
        .select('*')
        .eq('trip_id', auth.tripId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);
      if (cursor) q = q.lt('created_at', cursor);

      const { data } = await q;
      const items = (data ?? []).slice(0, limit);
      const nextCursor = data && data.length > limit ? items[items.length - 1].created_at : null;
      statusCode = 200;
      return NextResponse.json(ok({ items, next_cursor: nextCursor }));
    })();
    if (response instanceof NextResponse) statusCode = response.status;
    return response;
  } finally {
    logRequest({ apiKeyId, endpoint: '/api/v1/transactions', method: 'GET', statusCode, ...meta }).catch(() => {});
  }
}
