// app/api/v1/trips/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireBearer } from '@/lib/auth/api-key';
import { getAdminClient } from '@/lib/db/client';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { logRequest, extractRequestMeta } from '@/lib/services/audit';

export async function GET(req: NextRequest) {
  let apiKeyId: string | null = null;
  let statusCode = 500;
  const meta = extractRequestMeta(req);
  try {
    const response = await withErrorBoundary(async () => {
      const auth = await requireBearer(req);
      apiKeyId = auth.apiKeyId;
      const sb = getAdminClient();
      const { data } = await sb.from('trips')
        .select('id, name, location, start_date, end_date, status, created_at')
        .eq('id', auth.tripId)
        .single();
      statusCode = 200;
      return NextResponse.json(ok(data));
    })();
    if (response instanceof NextResponse) statusCode = response.status;
    return response;
  } finally {
    logRequest({ apiKeyId, endpoint: '/api/v1/trips/me', method: 'GET', statusCode, ...meta }).catch(() => {});
  }
}
