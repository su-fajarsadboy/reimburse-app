import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { TripWithParticipants } from '@/lib/validation/participant';
import { createTripWithParticipants } from '@/lib/services/trips';
import { withErrorBoundary, ok } from '@/lib/api/route-helpers';

export async function POST(req: NextRequest) {
  return withErrorBoundary(async () => {
    const admin = await requireAdmin();
    const body = await req.json();
    const parsed = TripWithParticipants.parse(body);
    const result = await createTripWithParticipants({ data: parsed, createdBy: admin.id });
    return NextResponse.json(ok(result), { status: 201 });
  })();
}
