import { NextRequest, NextResponse } from 'next/server';
import { requireApprover } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { z } from 'zod';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

const RejectInput = z.object({ review_note: z.string().max(500).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; txnId: string }> }) {
  return withErrorBoundary(async () => {
    const admin = await requireApprover();
    const { txnId } = await ctx.params;
    const parsed = RejectInput.parse(await req.json());
    const sb = getAdminClient();

    const { data, error } = await sb.from('transactions').update({
      status: 'rejected',
      approved_amount: 0,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.review_note ?? 'Ditolak',
    }).eq('id', txnId).select('*').single();

    if (error || !data) throw new ApiError('NOT_FOUND', 404, 'Transaksi tidak ditemukan');
    return NextResponse.json(ok(data));
  })();
}
