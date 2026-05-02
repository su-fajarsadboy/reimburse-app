import { NextRequest, NextResponse } from 'next/server';
import { requireApprover } from '@/lib/auth/server';
import { getAdminClient } from '@/lib/db/client';
import { z } from 'zod';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/errors';

const BulkApproveInput = z.object({
  txn_ids: z.array(z.string()).min(1).max(100),
  review_note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    const admin = await requireApprover();
    const { id } = await ctx.params;
    const parsed = BulkApproveInput.parse(await req.json());
    const sb = getAdminClient();

    const { data: candidates } = await sb.from('transactions')
      .select('id, amount')
      .eq('trip_id', id)
      .eq('is_reimbursable', true)
      .eq('status', 'pending')
      .in('id', parsed.txn_ids);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(ok({ approved: 0 }));
    }

    const now = new Date().toISOString();
    const note = parsed.review_note ?? 'Bulk approved';

    let approvedCount = 0;
    for (const c of candidates) {
      const { error } = await sb.from('transactions').update({
        status: 'approved',
        approved_amount: c.amount,
        reviewed_by: admin.id,
        reviewed_at: now,
        review_note: note,
      }).eq('id', c.id);
      if (!error) approvedCount++;
    }

    return NextResponse.json(ok({ approved: approvedCount }));
  })();
}
