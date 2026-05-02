import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { buildReimburseRows, buildZipFilename } from '@/lib/services/export';
import { withErrorBoundary } from '@/lib/api/route-helpers';
import archiver from 'archiver';
import { Readable } from 'node:stream';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  return withErrorBoundary(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const { rawTransactions } = await buildReimburseRows(id);

    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    archive.on('data', c => chunks.push(c));
    const done = new Promise<void>(res => archive.on('end', () => res()));

    for (const t of rawTransactions) {
      const r = await fetch(t.receipt_url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      archive.append(buf, { name: buildZipFilename('reimburse', t) });
    }
    await archive.finalize();
    await done;

    const body = Buffer.concat(chunks);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="reimburse-${id}.zip"`,
      },
    });
  })() as Promise<NextResponse>;
}
