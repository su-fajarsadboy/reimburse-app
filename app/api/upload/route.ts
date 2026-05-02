import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import { resolveShareToken } from '@/lib/auth/share-token';
import { uploadReceipt } from '@/lib/services/storage';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return withErrorBoundary(async () => {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const shareToken = url.searchParams.get('token');

    let tripId: string | null = null;
    if (session?.user?.id && url.searchParams.get('trip_id')) {
      tripId = url.searchParams.get('trip_id');
    } else if (shareToken) {
      const t = await resolveShareToken(shareToken);
      if (t.status !== 'active') throw new ApiError('TRIP_CLOSED', 403, 'Trip sudah ditutup');
      tripId = t.trip_id;
    } else {
      throw new ApiError('INVALID_AUTH', 401, 'Login admin atau share token diperlukan');
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      throw new ApiError('VALIDATION_ERROR', 422, 'Field "file" wajib');
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadReceipt({ buffer, mimeType: file.type, tripId: tripId! });
    return NextResponse.json(ok({ receipt_url: result.url }), { status: 201 });
  })();
}
