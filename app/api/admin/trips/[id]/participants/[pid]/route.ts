import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { ParticipantInput } from '@/lib/validation/participant';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; pid: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { pid } = await ctx.params;
    const parsed = ParticipantInput.partial().parse(await req.json());
    const sb = getAdminClient();
    const { data, error } = await sb.from('participants').update(parsed).eq('id', pid).select('*').single();
    if (error || !data) throw new ApiError('NOT_FOUND', 404, 'Peserta tidak ditemukan');
    return NextResponse.json(ok(data));
  })();
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; pid: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { pid } = await ctx.params;
    const sb = getAdminClient();

    // Hard guard: refuse if peserta is the payer of any transaction.
    // Reassign their transactions to a different payer first if you want
    // to retire them.
    const { count: payerCount } = await sb
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('payer_id', pid);
    if ((payerCount ?? 0) > 0) {
      throw new ApiError(
        'VALIDATION_ERROR',
        422,
        `Peserta tidak bisa dihapus karena masih jadi payer di ${payerCount} transaksi. Reassign payer-nya dulu.`,
      );
    }

    // Soft requirement gate: caller must explicitly opt in to redistributing
    // splits via ?force=true (the UI confirms this with the user). Without
    // it we surface a 409 + meta so the client can show a meaningful prompt.
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';
    const { count: splitCount } = await sb
      .from('transaction_participants')
      .select('*', { count: 'exact', head: true })
      .eq('participant_id', pid);
    const splits = splitCount ?? 0;

    if (splits > 0 && !force) {
      throw new ApiError(
        'VALIDATION_ERROR',
        409,
        `Peserta ini ada di split ${splits} transaksi. Konfirmasi dengan ?force=true untuk lanjutkan — share-nya akan dibagi ulang ke peserta tersisa.`,
        { affected_splits: String(splits) },
      );
    }

    if (splits > 0 && force) {
      const { error: jErr } = await sb
        .from('transaction_participants')
        .delete()
        .eq('participant_id', pid);
      if (jErr) throw new ApiError('INTERNAL_ERROR', 500, jErr.message);
    }

    const { error } = await sb.from('participants').delete().eq('id', pid);
    if (error) throw new ApiError('INTERNAL_ERROR', 500, error.message);
    return NextResponse.json(ok({ deleted: true, affected_splits: splits }));
  })();
}
