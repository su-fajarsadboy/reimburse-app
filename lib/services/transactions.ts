import { getAdminClient } from '@/lib/db/client';
import { ApiError } from '@/lib/errors';
import type { TransactionInputT } from '@/lib/validation/transaction';
import { todayISO } from '@/lib/utils';

export async function validateBusinessRules(
  tripId: string,
  payerId: string,
  participantIds: string[]
): Promise<void> {
  const sb = getAdminClient();
  const { data: parts } = await sb
    .from('participants')
    .select('id')
    .eq('trip_id', tripId);
  const valid = new Set((parts ?? []).map(p => p.id));
  if (!valid.has(payerId)) {
    throw new ApiError('VALIDATION_ERROR', 422, 'payer_id bukan peserta trip ini', { payer_id: 'Tidak ditemukan di trip' });
  }
  for (const pid of participantIds) {
    if (!valid.has(pid)) {
      throw new ApiError('VALIDATION_ERROR', 422, 'Salah satu participant_id bukan peserta trip ini', { participant_ids: `${pid} tidak ditemukan` });
    }
  }
}

export async function insertTransaction(input: {
  tripId: string;
  data: TransactionInputT;
}): Promise<{ id: string; trip_id: string; date: string; amount: number; created_at: string }> {
  await validateBusinessRules(input.tripId, input.data.payer_id, input.data.participant_ids);

  const sb = getAdminClient();
  const { data: txn, error } = await sb.from('transactions').insert({
    trip_id: input.tripId,
    date: input.data.date ?? todayISO(),
    time: input.data.time ?? null,
    description: input.data.description,
    amount: input.data.amount,
    category: input.data.category,
    payer_id: input.data.payer_id,
    is_reimbursable: input.data.is_reimbursable,
    receipt_url: input.data.receipt_url ?? null,
    notes: input.data.notes ?? null,
    source: input.data.source,
  }).select('id, trip_id, date, amount, created_at').single();

  if (error || !txn) throw new ApiError('INTERNAL_ERROR', 500, error?.message ?? 'Insert failed');

  const links = input.data.participant_ids.map(pid => ({ transaction_id: txn.id, participant_id: pid }));
  const { error: linkErr } = await sb.from('transaction_participants').insert(links);
  if (linkErr) {
    await sb.from('transactions').delete().eq('id', txn.id);
    throw new ApiError('INTERNAL_ERROR', 500, `Participant link failed: ${linkErr.message}`);
  }

  return txn;
}

export async function assertEditable(txnId: string): Promise<void> {
  const sb = getAdminClient();
  const { data, error } = await sb.from('transactions')
    .select('status, is_reimbursable')
    .eq('id', txnId)
    .single();
  if (error || !data) throw new ApiError('NOT_FOUND', 404, 'Transaksi tidak ditemukan');
  if (data.is_reimbursable && data.status !== 'pending') {
    throw new ApiError('VALIDATION_ERROR', 409, 'Transaksi sudah direview. Reset ke pending dulu untuk edit.');
  }
}
