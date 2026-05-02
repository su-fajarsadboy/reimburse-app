import 'dotenv/config';
import { getAdminClient } from '@/lib/db/client';

const KEEP_TRIP_ID = 'trip_Y9LOpPQah-qQTQVSV9NDG';

async function main() {
  const sb = getAdminClient();

  const { data: existing, error: checkErr } = await sb
    .from('trips')
    .select('id, name')
    .eq('id', KEEP_TRIP_ID)
    .maybeSingle();
  if (checkErr) throw new Error(`[wipe-except] lookup failed: ${checkErr.message}`);
  if (!existing) throw new Error(`[wipe-except] trip ${KEEP_TRIP_ID} not found — aborting to avoid wiping everything`);
  console.log(`[wipe-except] keeping trip: ${existing.id} (${existing.name})`);

  const { data: others, error: listErr } = await sb
    .from('trips')
    .select('id, name')
    .neq('id', KEEP_TRIP_ID);
  if (listErr) throw new Error(`[wipe-except] list trips failed: ${listErr.message}`);

  const otherIds = (others ?? []).map((t) => t.id);
  console.log(`[wipe-except] trips to delete: ${otherIds.length}`);
  for (const t of others ?? []) console.log(`  - ${t.id} (${t.name})`);

  if (otherIds.length === 0) {
    console.log('[wipe-except] nothing to delete.');
    return;
  }

  // FK in 0001_init.sql declares transactions.payer_id and
  // transaction_participants.participant_id as RESTRICT (no on-delete clause),
  // so we have to manually pre-delete children before letting trips cascade.
  // Order: transactions (cascades transaction_participants) → api_keys (cascades
  // idempotency_records) → participants → trips.

  // a) Collect transaction ids for these trips so we can wipe their join rows
  const { data: txnRows } = await sb
    .from('transactions')
    .select('id')
    .in('trip_id', otherIds);
  const txnIds = (txnRows ?? []).map((t) => t.id);
  if (txnIds.length > 0) {
    const { error: tpErr, count: tpCount } = await sb
      .from('transaction_participants')
      .delete({ count: 'exact' })
      .in('transaction_id', txnIds);
    if (tpErr) throw new Error(`Delete transaction_participants failed: ${tpErr.message}`);
    console.log(`[wipe-except] transaction_participants deleted: ${tpCount ?? '?'}`);

    const { error: txErr, count: txCount } = await sb
      .from('transactions')
      .delete({ count: 'exact' })
      .in('trip_id', otherIds);
    if (txErr) throw new Error(`Delete transactions failed: ${txErr.message}`);
    console.log(`[wipe-except] transactions             deleted: ${txCount ?? '?'}`);
  } else {
    console.log('[wipe-except] no transactions to delete');
  }

  // b) audit_logs: kill rows pointing at api_keys we're about to remove
  //    (audit_logs has on delete set null, but cleaner to wipe them outright).
  const { data: keyRows } = await sb
    .from('api_keys')
    .select('id')
    .in('trip_id', otherIds);
  const keyIds = (keyRows ?? []).map((k) => k.id);
  if (keyIds.length > 0) {
    const { error: aErr, count: aCount } = await sb
      .from('audit_logs')
      .delete({ count: 'exact' })
      .in('api_key_id', keyIds);
    if (aErr) console.warn(`[wipe-except] audit_logs cleanup failed: ${aErr.message}`);
    else console.log(`[wipe-except] audit_logs               deleted: ${aCount ?? '?'}`);

    const { error: kErr, count: kCount } = await sb
      .from('api_keys')
      .delete({ count: 'exact' })
      .in('trip_id', otherIds);
    if (kErr) throw new Error(`Delete api_keys failed: ${kErr.message}`);
    console.log(`[wipe-except] api_keys                  deleted: ${kCount ?? '?'}`);
  }

  // c) participants now safe to remove
  const { error: pErr, count: pCount } = await sb
    .from('participants')
    .delete({ count: 'exact' })
    .in('trip_id', otherIds);
  if (pErr) throw new Error(`Delete participants failed: ${pErr.message}`);
  console.log(`[wipe-except] participants              deleted: ${pCount ?? '?'}`);

  // d) trips
  const { error: delErr, count } = await sb
    .from('trips')
    .delete({ count: 'exact' })
    .neq('id', KEEP_TRIP_ID);
  if (delErr) throw new Error(`Delete trips failed: ${delErr.message}`);
  console.log(`[wipe-except] trips                     deleted: ${count ?? '?'}`);

  // Storage: receipts/<trip_id>/* — drop folders for trips we just removed.
  let totalRemoved = 0;
  for (const tripId of otherIds) {
    const { data: inner } = await sb.storage.from('receipts').list(tripId, { limit: 1000 });
    if (inner && inner.length > 0) {
      const paths = inner.map((f) => `${tripId}/${f.name}`);
      const { error } = await sb.storage.from('receipts').remove(paths);
      if (!error) {
        totalRemoved += inner.length;
        console.log(`[wipe-except] receipts/${tripId} removed ${inner.length} files`);
      }
    }
  }
  console.log(`[wipe-except] storage total removed ${totalRemoved} files`);
  console.log('[wipe-except] done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
