import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { ApiKeyInput } from '@/lib/validation/api-key';
import { generateApiKey } from '@/lib/services/api-key';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const parsed = ApiKeyInput.parse(await req.json());
    const result = await generateApiKey({ tripId: id, label: parsed.label });
    return NextResponse.json(
      ok({ id: result.record.id, label: result.record.label, key_prefix: result.record.key_prefix, plain: result.plain }),
      { status: 201 }
    );
  })();
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const sb = getAdminClient();
    const { data } = await sb.from('api_keys')
      .select('id, key_prefix, label, last_used_at, revoked_at, created_at')
      .eq('trip_id', id)
      .order('created_at', { ascending: false });
    return NextResponse.json(ok(data ?? []));
  })();
}
