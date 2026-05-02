// app/api/v1/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireBearer } from '@/lib/auth/api-key';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { CATEGORIES } from '@/lib/validation/transaction';
import { logRequest, extractRequestMeta } from '@/lib/services/audit';

export async function GET(req: NextRequest) {
  let apiKeyId: string | null = null;
  let statusCode = 500;
  const meta = extractRequestMeta(req);
  try {
    const response = await withErrorBoundary(async () => {
      const auth = await requireBearer(req);
      apiKeyId = auth.apiKeyId;
      statusCode = 200;
      return NextResponse.json(ok(CATEGORIES.map(id => ({ id, label: id }))));
    })();
    if (response instanceof NextResponse) statusCode = response.status;
    return response;
  } finally {
    logRequest({ apiKeyId, endpoint: '/api/v1/categories', method: 'GET', statusCode, ...meta }).catch(() => {});
  }
}
