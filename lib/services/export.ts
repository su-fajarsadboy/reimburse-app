import { stringify } from 'csv-stringify/sync';
import { getAdminClient } from '@/lib/db/client';
import { slugify } from '@/lib/utils';

export type ExportRow = {
  tanggal: string;
  deskripsi: string;
  kategori: string;
  nominal: number;
  payer: string;
  reimbursable: string;
  status: string;
  receipt_url: string;
  notes: string;
};

export async function buildReimburseRows(tripId: string): Promise<{ rows: ExportRow[]; rawTransactions: Array<{ id: string; date: string; description: string; receipt_url: string | null }> }> {
  const sb = getAdminClient();
  const { data: txns } = await sb.from('transactions')
    .select('id, date, description, category, amount, approved_amount, status, payer_id, receipt_url, notes, participants:payer_id(name)')
    .eq('trip_id', tripId)
    .eq('is_reimbursable', true)
    .eq('status', 'approved')
    .order('date', { ascending: true });

  const rows: ExportRow[] = (txns ?? []).map(t => {
    const finalAmount = t.approved_amount ?? t.amount;
    const payer = (t as unknown as { participants: { name: string } | null }).participants?.name ?? '-';
    return {
      tanggal: t.date,
      deskripsi: t.description,
      kategori: t.category,
      nominal: finalAmount,
      payer,
      reimbursable: 'ya',
      status: t.status,
      receipt_url: t.receipt_url ?? '',
      notes: t.notes ?? '',
    };
  });

  const rawTransactions = (txns ?? [])
    .filter(t => t.receipt_url)
    .map(t => ({ id: t.id, date: t.date, description: t.description, receipt_url: t.receipt_url! }));

  return { rows, rawTransactions };
}

export function rowsToCsv(rows: ExportRow[]): string {
  const csv = stringify(rows, {
    header: true,
    columns: ['tanggal', 'deskripsi', 'kategori', 'nominal', 'payer', 'reimbursable', 'status', 'receipt_url', 'notes'],
  });
  return '﻿' + csv; // UTF-8 BOM for Excel
}

export function buildZipFilename(prefix: string, t: { id: string; date: string; description: string }): string {
  const slug = slugify(t.description) || 'struk';
  const shortId = t.id.slice(0, 12);
  return `${prefix}_${t.date}_${slug}_${shortId}.jpg`;
}
