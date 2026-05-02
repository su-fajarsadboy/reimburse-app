// app/api/v1/receipts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireBearer } from '@/lib/auth/api-key';
import { uploadReceipt } from '@/lib/services/storage';
import { getRateLimiter } from '@/lib/services/rate-limit';
import { logRequest, extractRequestMeta } from '@/lib/services/audit';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let apiKeyId: string | null = null;
  let statusCode = 500;
  const meta = extractRequestMeta(req);
  try {
    const response = await withErrorBoundary(async () => {
      const auth = await requireBearer(req);
      apiKeyId = auth.apiKeyId;
      const rl = await getRateLimiter().check(auth.apiKeyId);
      if (!rl.success) throw new ApiError('RATE_LIMITED', 429, 'Rate limit terlampaui');

      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        throw new ApiError('VALIDATION_ERROR', 422, 'Field "file" wajib');
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await uploadReceipt({ buffer: buf, mimeType: file.type, tripId: auth.tripId });
      statusCode = 201;
      return NextResponse.json(ok({ receipt_url: result.url, expires_at: null }), { status: 201 });
    })();
    if (response instanceof NextResponse) statusCode = response.status;
    return response;
  } finally {
    logRequest({ apiKeyId, endpoint: '/api/v1/receipts', method: 'POST', statusCode, ...meta }).catch(() => {});
  }
}
