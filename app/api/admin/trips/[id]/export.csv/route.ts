import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { buildReimburseRows, rowsToCsv } from '@/lib/services/export';
import { withErrorBoundary } from '@/lib/api/route-helpers';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const { rows } = await buildReimburseRows(id);
    const csv = rowsToCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reimburse-${id}.csv"`,
      },
    });
  })() as Promise<NextResponse>;
}
