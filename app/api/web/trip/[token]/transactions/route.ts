import { NextRequest, NextResponse } from 'next/server';
import { requireActiveTrip } from '@/lib/auth/share-token';
import { TransactionInput } from '@/lib/validation/transaction';
import { insertTransaction } from '@/lib/services/transactions';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';
import { getAdminClient } from '@/lib/db/client';

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  return withErrorBoundary(async () => {
    const { token } = await ctx.params;
    const tripId = await requireActiveTrip(token);
    const parsed = TransactionInput.parse(await req.json());
    // Optional `x-participant-id` header lets us record who submitted.
    // Falls back to the payer when the header is missing (older clients).
    const headerPid = req.headers.get('x-participant-id')?.trim();
    const submitterPid = headerPid && headerPid.length > 0 ? headerPid : parsed.payer_id;
    const result = await insertTransaction({
      tripId,
      data: parsed,
      submitter: { kind: 'participant', participantId: submitterPid },
    });
    return NextResponse.json(ok(result), { status: 201 });
  })();
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  return withErrorBoundary(async () => {
    const { token } = await ctx.params;
    const tripId = await requireActiveTrip(token);
    const sb = getAdminClient();
    const { data } = await sb.from('transactions')
      .select('*, transaction_participants(participant_id)')
      .eq('trip_id', tripId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    return NextResponse.json(ok(data ?? []));
  })();
}
