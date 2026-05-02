import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { customAlphabet } from 'nanoid';
import { getAdminClient } from '@/lib/db/client';

const TRIP_ID = 'trip_Y9LOpPQah-qQTQVSV9NDG';
const RECEIPT = '/tmp/hijrahfood.jpg';

const nano21 = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);

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

  const buf = await readFile(RECEIPT);
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

  const description = 'Hijrahfood Meatshop (daging sukiyaki + ayam + saus)';
  const amount = 490_340;
  const date = '2026-04-30';
  const category = 'logistik' as const;
  const payerId = partsByName['Refa'];
  if (!payerId) throw new Error('Refa not found');

  const { data: txn, error: txnErr } = await sb
    .from('transactions')
    .insert({
      trip_id: TRIP_ID,
      date,
      description,
      amount,
      category,
      payer_id: payerId,
      is_reimbursable: true,
      receipt_url: receiptUrl,
      notes:
        'Tokopedia · Hijrahfood Meatshop · Beef Sukiyaki 1.5kg + Chicken Breast 2kg + Mushroom Sauce + BBQ Sauce · BCA VA · Invoice 583774093853231007',
      source: 'import',
      created_by_user_id: adminId,
    })
    .select('id')
    .single();
  if (txnErr || !txn) throw new Error(`Insert failed: ${txnErr?.message}`);

  const links = allPartIds.map((pid) => ({ transaction_id: txn.id, participant_id: pid }));
  const { error: linkErr } = await sb.from('transaction_participants').insert(links);
  if (linkErr) throw new Error(`Link failed: ${linkErr.message}`);

  console.log(`[tokped] ✓ ${description}`);
  console.log(`[tokped]   Rp ${amount.toLocaleString('id-ID')} payer=Refa date=${date}`);
  console.log(`[tokped]   receipt=${receiptUrl}`);
  console.log(`[tokped]   txn_id=${txn.id}, split rata 5 peserta, reimbursable=true`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
