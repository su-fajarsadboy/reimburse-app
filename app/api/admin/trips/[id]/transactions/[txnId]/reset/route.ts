import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

export async function POST(_: Request, ctx: { params: Promise<{ id: string; txnId: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { txnId } = await ctx.params;
    const sb = getAdminClient();
    const { data, error } = await sb.from('transactions').update({
      status: 'pending',
      approved_amount: null,
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
    }).eq('id', txnId).select('*').single();
    if (error || !data) throw new ApiError('NOT_FOUND', 404, 'Transaksi tidak ditemukan');
    return NextResponse.json(ok(data));
  })();
}
