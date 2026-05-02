import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { customAlphabet } from 'nanoid';
import { getAdminClient } from '@/lib/db/client';

const TRIP_ID = 'trip_Y9LOpPQah-qQTQVSV9NDG';
const FOLDER = '/Users/mohammadrezafahlepi/Downloads/pengeluaran sentul';

const nano21 = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);

type Item = {
  file: string;
  description: string;
  amount: number;
  date: string;
  category: 'transport' | 'makan' | 'logistik' | 'sewa_alat' | 'tiket' | 'lain';
  payer: string; // participant name
  notes?: string;
};

const ITEMS: Item[] = [
  {
    file: 'WhatsApp Image 2026-05-02 at 17.29.25.jpeg',
    description: 'Belanja Lion Super Indo (logistik dapur trip)',
    amount: 402_470,
    date: '2026-04-30',
    category: 'logistik',
    payer: 'Refa',
    notes: 'ShopeePay 30 Apr 22:08',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.29.33.jpeg',
    description: 'Nasi rames warung',
    amount: 30_000,
    date: '2026-05-01',
    category: 'makan',
    payer: 'Refa',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.29.57.jpeg',
    description: 'Point Coffee',
    amount: 100_000,
    date: '2026-05-01',
    category: 'makan',
    payer: 'Refa',
    notes: 'Iced Palm Sugar Latte + Hummingbird Butter',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.30.17.jpeg',
    description: 'ESB Resto - makan siang',
    amount: 94_000,
    date: '2026-05-01',
    category: 'makan',
    payer: 'Refa',
    notes: 'Nasi ayam goreng + es jeruk',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.30.34.jpeg',
    description: 'Belanja kelontong (Energen, Bimoli, Krupuk, Air Mineral)',
    amount: 63_000,
    date: '2026-05-01',
    category: 'logistik',
    payer: 'Refa',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.56.39.jpeg',
    description: 'Hoki Toko-HO (kelontong Pasar Modern BSD)',
    amount: 40_000,
    date: '2026-05-01',
    category: 'logistik',
    payer: 'Refa',
    notes: 'Jago/QRIS 1 Mei 10:31',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.30.57.jpeg',
    description: 'Sentra Sayur',
    amount: 33_000,
    date: '2026-05-01',
    category: 'makan',
    payer: 'Refa',
    notes: 'Selada keriting, romaine, sereh, daun salam, bawang',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.31.18.jpeg',
    description: 'Sewa Outdoor Bogor Adv',
    amount: 258_000,
    date: '2026-05-01',
    category: 'sewa_alat',
    payer: 'Yahya',
    notes: 'Transfer SeaBank → Sewa Outdoor Bogor Adv',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.31.19.jpeg',
    description: 'Ayam bumbu Titi',
    amount: 70_000,
    date: '2026-05-01',
    category: 'makan',
    payer: 'Yahya',
    notes: 'Transfer SeaBank → Ayam bumbu Titi',
  },
  {
    file: 'WhatsApp Image 2026-05-02 at 17.33.30.jpeg',
    description: 'Karuna Telur',
    amount: 10_000,
    date: '2026-05-01',
    category: 'logistik',
    payer: 'Refa',
    notes: 'GoPay - Tabungan by Jago',
  },
];

async function main() {
  const sb = getAdminClient();

  // Resolve participants by name
  const { data: parts } = await sb
    .from('participants')
    .select('id, name')
    .eq('trip_id', TRIP_ID);
  if (!parts || parts.length === 0) throw new Error('Trip has no participants');
  const partsByName = Object.fromEntries(parts.map((p) => [p.name, p.id]));
  const allPartIds = parts.map((p) => p.id);
  console.log(`[import] trip ${TRIP_ID} has ${parts.length} peserta:`, parts.map((p) => p.name).join(', '));

  // Resolve admin user id (the importer's identity)
  const { data: adminRow } = await sb
    .from('users')
    .select('id')
    .eq('email', 'admin@example.com')
    .single();
  const adminId = adminRow?.id ?? null;
  console.log(`[import] importer = admin@example.com (id=${adminId ?? 'null'})`);

  let inserted = 0;
  let totalAmount = 0;

  for (const it of ITEMS) {
    const filePath = `${FOLDER}/${it.file}`;
    const buf = await readFile(filePath);
    // Compress + auto-rotate (matches uploadReceipt() behavior)
    const compressed = await sharp(buf)
      .rotate()
      .resize(1920, null, { withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const storageKey = `${TRIP_ID}/${nano21()}.jpg`;
    const { error: upErr } = await sb.storage
      .from('receipts')
      .upload(storageKey, compressed, { contentType: 'image/jpeg', upsert: false });
    if (upErr) throw new Error(`Upload ${it.file} failed: ${upErr.message}`);
    const { data: urlData } = sb.storage.from('receipts').getPublicUrl(storageKey);
    const receiptUrl = urlData.publicUrl;

    const payerId = partsByName[it.payer];
    if (!payerId) throw new Error(`Payer ${it.payer} not found in trip participants`);

    const { data: txn, error: txnErr } = await sb
      .from('transactions')
      .insert({
        trip_id: TRIP_ID,
        date: it.date,
        description: it.description,
        amount: it.amount,
        category: it.category,
        payer_id: payerId,
        is_reimbursable: false,
        receipt_url: receiptUrl,
        notes: it.notes ?? null,
        source: 'import',
        created_by_user_id: adminId,
      })
      .select('id, amount')
      .single();
    if (txnErr || !txn) throw new Error(`Insert txn ${it.description} failed: ${txnErr?.message}`);

    // Split: every participant gets a share
    const links = allPartIds.map((pid) => ({
      transaction_id: txn.id,
      participant_id: pid,
    }));
    const { error: linkErr } = await sb.from('transaction_participants').insert(links);
    if (linkErr) {
      await sb.from('transactions').delete().eq('id', txn.id);
      throw new Error(`Link participants for ${it.description} failed: ${linkErr.message}`);
    }

    inserted += 1;
    totalAmount += it.amount;
    console.log(
      `[import] ✓ ${it.description.padEnd(50)} Rp ${it.amount.toLocaleString('id-ID').padStart(9)} payer=${it.payer}`,
    );
  }

  console.log('');
  console.log(`[import] inserted ${inserted} transactions, total Rp ${totalAmount.toLocaleString('id-ID')}`);
  console.log(`[import] all split evenly across ${allPartIds.length} peserta`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
