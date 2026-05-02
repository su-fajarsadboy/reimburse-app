import 'dotenv/config';
import { getAdminClient } from '@/lib/db/client';

/**
 * Wipe all transactional data, keeping the users table intact.
 * FK-safe ordering: children → parents.
 */
async function main() {
  const sb = getAdminClient();

  // Each entry: table name, "filter column" we use to express "match every row".
  // Supabase JS requires every delete() to be filter-bound, so we lean on a
  // never-null column per table.
  const tables = [
    { name: 'transaction_participants', col: 'transaction_id' },
    { name: 'transactions',             col: 'id' },
    { name: 'idempotency_records',      col: 'key' },
    { name: 'audit_logs',               col: 'id' },
    { name: 'api_keys',                 col: 'id' },
    { name: 'participants',             col: 'id' },
    { name: 'trips',                    col: 'id' },
  ] as const;

  for (const t of tables) {
    // The supabase typed client wants a string literal here; iterating widens
    // the type so we cast through unknown to satisfy both build and runtime.
    const q = (sb as unknown as { from: (n: string) => ReturnType<typeof sb.from> }).from(t.name);
    const { error, count } = await q.delete({ count: 'exact' }).not(t.col, 'is', null);
    if (error) throw new Error(`[wipe] delete ${t.name} failed: ${error.message}`);
    console.log(`[wipe] ${t.name.padEnd(26)} deleted ${count ?? '?'} rows`);
  }

  // Storage: walk the receipts bucket (root + per-trip subfolders).
  const { data: rootEntries } = await sb.storage.from('receipts').list('', { limit: 1000 });
  let totalRemoved = 0;
  for (const entry of rootEntries ?? []) {
    if (entry.id === null) {
      // folder (per-trip)
      const { data: inner } = await sb.storage
        .from('receipts')
        .list(entry.name, { limit: 1000 });
      if (inner && inner.length > 0) {
        const paths = inner.map((f) => `${entry.name}/${f.name}`);
        const { error } = await sb.storage.from('receipts').remove(paths);
        if (!error) {
          totalRemoved += inner.length;
          console.log(`[wipe] receipts/${entry.name.padEnd(20)} removed ${inner.length} files`);
        }
      }
    } else {
      // a file dropped in the bucket root
      const { error } = await sb.storage.from('receipts').remove([entry.name]);
      if (!error) totalRemoved += 1;
    }
  }
  console.log(`[wipe] storage total       removed ${totalRemoved} files`);
  console.log('[wipe] done. users table preserved.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
