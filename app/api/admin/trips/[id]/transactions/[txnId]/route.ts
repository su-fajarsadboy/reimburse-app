import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { TransactionUpdate } from '@/lib/validation/transaction';
import { assertEditable, validateBusinessRules } from '@/lib/services/transactions';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; txnId: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id, txnId } = await ctx.params;
    await assertEditable(txnId);
    const parsed = TransactionUpdate.parse(await req.json());

    if (parsed.payer_id || parsed.participant_ids) {
      await validateBusinessRules(
        id,
        parsed.payer_id ?? '',
        parsed.participant_ids ?? []
      );
    }

    const sb = getAdminClient();
    const updateRow = {
      ...(parsed.date !== undefined && { date: parsed.date }),
      ...(parsed.time !== undefined && { time: parsed.time ?? null }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.amount !== undefined && { amount: parsed.amount }),
      ...(parsed.category !== undefined && { category: parsed.category }),
      ...(parsed.payer_id !== undefined && { payer_id: parsed.payer_id }),
      ...(parsed.is_reimbursable !== undefined && { is_reimbursable: parsed.is_reimbursable }),
      ...(parsed.receipt_url !== undefined && { receipt_url: parsed.receipt_url ?? null }),
      ...(parsed.notes !== undefined && { notes: parsed.notes ?? null }),
    };

    const { data, error } = await sb.from('transactions').update(updateRow).eq('id', txnId).select('*').single();
    if (error || !data) throw new ApiError('INTERNAL_ERROR', 500, error?.message ?? 'Update failed');

    if (parsed.participant_ids) {
      await sb.from('transaction_participants').delete().eq('transaction_id', txnId);
      await sb.from('transaction_participants').insert(
        parsed.participant_ids.map(pid => ({ transaction_id: txnId, participant_id: pid }))
      );
    }

    return NextResponse.json(ok(data));
  })();
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string; txnId: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { txnId } = await ctx.params;
    const sb = getAdminClient();
    const { error } = await sb.from('transactions').delete().eq('id', txnId);
    if (error) throw new ApiError('INTERNAL_ERROR', 500, error.message);
    return NextResponse.json(ok({ deleted: true }));
  })();
}
