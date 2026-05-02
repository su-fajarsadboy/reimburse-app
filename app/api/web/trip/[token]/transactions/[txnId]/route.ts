import { NextRequest, NextResponse } from 'next/server';
import { requireActiveTrip } from '@/lib/auth/share-token';
import { TransactionUpdate } from '@/lib/validation/transaction';
import { assertEditable, validateBusinessRules } from '@/lib/services/transactions';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { getAdminClient } from '@/lib/db/client';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';

const ParticipantIdHeader = z.string().min(1);

async function assertPayerOwns(txnId: string, participantId: string): Promise<{ tripId: string }> {
  const sb = getAdminClient();
  const { data } = await sb.from('transactions')
    .select('id, trip_id, payer_id')
    .eq('id', txnId)
    .single();
  if (!data) throw new ApiError('NOT_FOUND', 404, 'Transaksi tidak ditemukan');
  if (data.payer_id !== participantId) {
    throw new ApiError('INVALID_AUTH', 403, 'Hanya yang membayar yang bisa edit/hapus');
  }
  return { tripId: data.trip_id };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ token: string; txnId: string }> }) {
  return withErrorBoundary(async () => {
    const { token, txnId } = await ctx.params;
    await requireActiveTrip(token);

    const participantId = ParticipantIdHeader.parse(req.headers.get('x-participant-id') ?? '');
    const { tripId } = await assertPayerOwns(txnId, participantId);
    await assertEditable(txnId);

    const parsed = TransactionUpdate.parse(await req.json());
    if (parsed.payer_id || parsed.participant_ids) {
      await validateBusinessRules(tripId, parsed.payer_id ?? '', parsed.participant_ids ?? []);
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

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ token: string; txnId: string }> }) {
  return withErrorBoundary(async () => {
    const { token, txnId } = await ctx.params;
    await requireActiveTrip(token);
    const participantId = ParticipantIdHeader.parse(req.headers.get('x-participant-id') ?? '');
    await assertPayerOwns(txnId, participantId);
    const sb = getAdminClient();
    const { error } = await sb.from('transactions').delete().eq('id', txnId);
    if (error) throw new ApiError('INTERNAL_ERROR', 500, error.message);
    return NextResponse.json(ok({ deleted: true }));
  })();
}
