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

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string; pid: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { pid } = await ctx.params;
    const sb = getAdminClient();
    const { count } = await sb.from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('payer_id', pid);
    if ((count ?? 0) > 0) {
      throw new ApiError('VALIDATION_ERROR', 422, 'Peserta tidak bisa dihapus karena masih ada transaksi atas namanya');
    }
    const { error } = await sb.from('participants').delete().eq('id', pid);
    if (error) throw new ApiError('INTERNAL_ERROR', 500, error.message);
    return NextResponse.json(ok({ deleted: true }));
  })();
}
