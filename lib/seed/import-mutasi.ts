import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { customAlphabet } from 'nanoid';
import { getAdminClient } from '@/lib/db/client';

const TRIP_ID = 'trip_Y9LOpPQah-qQTQVSV9NDG';
const SCREENSHOT = '/Users/mohammadrezafahlepi/.claude/image-cache/290bfe98-9420-4972-9937-c41a59dec256/1.png';

const nano21 = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);

type Item = {
  description: string;
  amount: number;
  date: string;
  category: 'transport' | 'makan' | 'logistik' | 'sewa_alat' | 'tiket' | 'lain';
  payer: string;
  notes?: string;
};

const ITEMS: Item[] = [
  {
    description: 'Tiket Wana Wisata Indah (camping ground)',
    amount: 300_000,
    date: '2026-05-01',
    category: 'tiket',
    payer: 'Refa',
    notes: 'Transfer Keluar BI Fast → WANA WISATA INDAH',
  },
  {
    description: 'Bensin SPBU 34-15147 Gondro Tangerang',
    amount: 379_700,
    date: '2026-05-01',
    category: 'transport',
    payer: 'Refa',
    notes: 'Pos Sales Debit SPBU 34-15147 Gondro Tangerang',
  },
];

async function main() {
  const sb = getAdminClient();
  const { data: parts } = await sb
    .from('participants')
    .select('id, name')
    .eq('trip_id', TRIP_ID);
  if (!parts || parts.length === 0) throw new Error('No participants');
  const partsByName = Object.fromEntries(parts.map((p) => [p.name, p.id]));
  const allPartIds = parts.map((p) => p.id);

  const { data: adminRow } = await sb
    .from('users')
    .select('id')
    .eq('email', 'admin@example.com')
    .single();
  const adminId = adminRow?.id ?? null;

  // Upload screenshot once, reuse for both transactions
  const buf = await readFile(SCREENSHOT);
  const compressed = await sharp(buf)
    .rotate()
    .resize(1920, null, { withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  const storageKey = `${TRIP_ID}/${nano21()}.jpg`;
  const { error: upErr } = await sb.storage
    .from('receipts')
    .upload(storageKey, compressed, { contentType: 'image/jpeg', upsert: false });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  const { data: urlData } = sb.storage.from('receipts').getPublicUrl(storageKey);
  const receiptUrl = urlData.publicUrl;
  console.log(`[mutasi] uploaded receipt → ${storageKey}`);

  let total = 0;
  for (const it of ITEMS) {
    const payerId = partsByName[it.payer];
    if (!payerId) throw new Error(`Payer ${it.payer} not found`);

    const { data: txn, error: txnErr } = await sb
      .from('transactions')
      .insert({
        trip_id: TRIP_ID,
        date: it.date,
        description: it.description,
        amount: it.amount,
        category: it.category,
        payer_id: payerId,
        is_reimbursable: true,
        receipt_url: receiptUrl,
        notes: it.notes ?? null,
        source: 'import',
        created_by_user_id: adminId,
      })
      .select('id')
      .single();
    if (txnErr || !txn) throw new Error(`Insert failed: ${txnErr?.message}`);

    const links = allPartIds.map((pid) => ({
      transaction_id: txn.id,
      participant_id: pid,
    }));
    const { error: linkErr } = await sb.from('transaction_participants').insert(links);
    if (linkErr) throw new Error(`Link failed: ${linkErr.message}`);

    total += it.amount;
    console.log(`[mutasi] ✓ ${it.description.padEnd(50)} Rp ${it.amount.toLocaleString('id-ID').padStart(9)} payer=${it.payer}`);
  }
  console.log(`[mutasi] Total ditambah Rp ${total.toLocaleString('id-ID')} (${ITEMS.length} transaksi, semua reimbursable)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
