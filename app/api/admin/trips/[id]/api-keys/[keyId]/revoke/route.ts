import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { revokeApiKey } from '@/lib/services/api-key';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';

export async function POST(_: Request, ctx: { params: Promise<{ id: string; keyId: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { keyId } = await ctx.params;
    await revokeApiKey(keyId);
    return NextResponse.json(ok({ revoked: true }));
  })();
}
