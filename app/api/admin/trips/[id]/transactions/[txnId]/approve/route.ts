import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { ApprovalInput } from '@/lib/validation/transaction';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; txnId: string }> }) {
  return withErrorBoundary(async () => {
    const admin = await requireAdmin();
    const { txnId } = await ctx.params;
    const parsed = ApprovalInput.parse(await req.json());
    const sb = getAdminClient();

    const { data: existing } = await sb.from('transactions')
      .select('is_reimbursable')
      .eq('id', txnId)
      .single();
    if (!existing) throw new ApiError('NOT_FOUND', 404, 'Transaksi tidak ditemukan');
    if (!existing.is_reimbursable) {
      throw new ApiError('VALIDATION_ERROR', 422, 'Transaksi bukan reimbursable, tidak perlu approval');
    }

    const { data, error } = await sb.from('transactions').update({
      status: 'approved',
      approved_amount: parsed.approved_amount,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.review_note ?? null,
    }).eq('id', txnId).select('*').single();

    if (error || !data) throw new ApiError('INTERNAL_ERROR', 500, error?.message ?? 'Update failed');
    return NextResponse.json(ok(data));
  })();
}
