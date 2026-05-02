import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const sb = getAdminClient();
    const now = new Date().toISOString();

    const { error: tErr } = await sb.from('trips')
      .update({ status: 'closed', closed_at: now })
      .eq('id', id);
    if (tErr) throw new ApiError('INTERNAL_ERROR', 500, tErr.message);

    await sb.from('api_keys')
      .update({ revoked_at: now })
      .eq('trip_id', id)
      .is('revoked_at', null);

    return NextResponse.json(ok({ closed: true }));
  })();
}
