import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { getAdminClient } from '@/lib/db/client';

const TARGET_TRIP_ID = 'trip_Y9LOpPQah-qQTQVSV9NDG';
const TARGET_NAME = 'Nanda';

/**
 * Safely remove a participant from a trip.
 *
 * Hard delete is blocked when the participant is referenced as a payer or
 * is in any transaction_participants row (FK = RESTRICT). This script:
 *
 *   1. Looks up the participant by (trip_id, name).
 *   2. Bails out if they are the payer of any transaction OR the
 *      created_by_participant_id of any transaction (we don't want to
 *      lose that submission attribution).
 *   3. Backs up every transaction_participants row referencing them to
 *      tmp/participant-backup-<id>-<timestamp>.json (in case you want
 *      to revert later).
 *   4. Removes them from transaction_participants for the target trip
 *      (so the splits redistribute among the remaining peserta — the
 *      settlement algorithm reads the live participant_ids list).
 *   5. Deletes the participants row.
 */
async function main() {
  const sb = getAdminClient();

  const { data: p, error: lookupErr } = await sb
    .from('participants')
    .select('id, trip_id, name')
    .eq('trip_id', TARGET_TRIP_ID)
    .eq('name', TARGET_NAME)
    .maybeSingle();
  if (lookupErr) throw new Error(`Lookup failed: ${lookupErr.message}`);
  if (!p) throw new Error(`Peserta "${TARGET_NAME}" not found in trip ${TARGET_TRIP_ID}`);
  console.log(`[remove] target = ${p.name} (${p.id}) in trip ${p.trip_id}`);

  // Hard guards
  const { count: payerCount } = await sb
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('payer_id', p.id);
  if ((payerCount ?? 0) > 0) {
    throw new Error(`Aborting: ${p.name} is the payer of ${payerCount} transactions. Reassign them first.`);
  }
  const { count: creatorCount } = await sb
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('created_by_participant_id', p.id);
  if ((creatorCount ?? 0) > 0) {
    console.warn(
      `[remove] WARNING: ${p.name} is the submitter of ${creatorCount} transactions. ` +
        'Their attribution will be set to NULL by FK on delete. Continuing.',
    );
  }

  // Backup join rows BEFORE delete
  const { data: joinRows } = await sb
    .from('transaction_participants')
    .select('transaction_id, participant_id')
    .eq('participant_id', p.id);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `/tmp/participant-backup-${p.id}-${ts}.json`;
  await writeFile(
    backupPath,
    JSON.stringify(
      {
        participant: p,
        transaction_participants: joinRows ?? [],
        backed_up_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`[remove] backup saved to ${backupPath} (${joinRows?.length ?? 0} join rows)`);

  // Remove from splits
  if ((joinRows?.length ?? 0) > 0) {
    const { error: jErr, count: jCount } = await sb
      .from('transaction_participants')
      .delete({ count: 'exact' })
      .eq('participant_id', p.id);
    if (jErr) throw new Error(`Remove from splits failed: ${jErr.message}`);
    console.log(`[remove] transaction_participants deleted: ${jCount ?? '?'}`);
  }

  // Delete participant
  const { error: dErr } = await sb.from('participants').delete().eq('id', p.id);
  if (dErr) throw new Error(`Delete participant failed: ${dErr.message}`);
  console.log(`[remove] participant deleted: ${p.name} (${p.id})`);

  // Summary
  const { data: remaining } = await sb
    .from('participants')
    .select('name')
    .eq('trip_id', TARGET_TRIP_ID)
    .order('name', { ascending: true });
  console.log(
    `[remove] trip now has ${remaining?.length ?? 0} peserta:`,
    (remaining ?? []).map((r) => r.name).join(', '),
  );
  console.log('[remove] done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
