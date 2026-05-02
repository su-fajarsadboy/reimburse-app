import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { ParticipantInput } from '@/lib/validation/participant';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';
import { pickColor } from '@/lib/utils';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const parsed = ParticipantInput.parse(await req.json());
    const sb = getAdminClient();
    const { count } = await sb.from('participants').select('*', { count: 'exact', head: true }).eq('trip_id', id);
    const { data, error } = await sb.from('participants').insert({
      trip_id: id,
      name: parsed.name,
      color: pickColor(count ?? 0),
    }).select('*').single();
    if (error || !data) throw new ApiError('INTERNAL_ERROR', 500, error?.message ?? 'Insert failed');
    return NextResponse.json(ok(data), { status: 201 });
  })();
}
