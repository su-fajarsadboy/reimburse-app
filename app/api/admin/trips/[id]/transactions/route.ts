import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { TransactionInput } from '@/lib/validation/transaction';
import { insertTransaction } from '@/lib/services/transactions';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const parsed = TransactionInput.parse(await req.json());
    const result = await insertTransaction({ tripId: id, data: parsed });
    return NextResponse.json(ok(result), { status: 201 });
  })();
}
