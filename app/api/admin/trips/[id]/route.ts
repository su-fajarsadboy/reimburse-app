import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { TripInput } from '@/lib/validation/trip';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const parsed = TripInput.partial().parse(await req.json());
    const sb = getAdminClient();
    const { data, error } = await sb.from('trips').update(parsed).eq('id', id).select('*').single();
    if (error || !data) throw new ApiError('NOT_FOUND', 404, 'Trip tidak ditemukan');
    return NextResponse.json(ok(data));
  })();
}
