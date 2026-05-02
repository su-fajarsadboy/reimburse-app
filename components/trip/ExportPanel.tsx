'use client';
import { Download, FileIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/utils';

type Tx = { id: string; date: string; description: string; category: string; amount: number; approved_amount: number | null; payer_id: string; receipt_url: string | null; is_reimbursable: boolean; status: string };

export function ExportPanel({ tripId, transactions, payerNames }: {
  tripId: string;
  transactions: Tx[];
  payerNames: Record<string, string>;
}) {
  const list = transactions.filter(t => t.is_reimbursable && t.status === 'approved');
  const total = list.reduce((s, t) => s + (t.approved_amount ?? t.amount), 0);
  const receiptCount = list.filter(t => t.receipt_url).length;

  return (
    <div className="space-y-4">
      <div className="bg-bg-1 border border-border rounded-lg p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded bg-primary-soft flex items-center justify-center"><Download size={20} /></div>
        <div className="flex-1">
          <div className="font-semibold">Export Laporan Reimburse</div>
          <div className="text-xs">Download CSV transaksi yang sudah disetujui + ZIP foto struk.</div>
        </div>
        <div className="flex gap-2">
          <a href={`/api/admin/trips/${tripId}/export.csv`} download>
            <Button><Download size={14} /> CSV</Button>
          </a>
          <a href={`/api/admin/trips/${tripId}/export.zip`} download>
            <Button variant="outline"><Download size={14} /> ZIP Foto</Button>
          </a>
        </div>
      </div>

      <div className="bg-bg-1 border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-medium">Preview ({list.length} item)</div>
          <span className="text-xs flex items-center gap-1"><FileIcon size={11} /> reimburse-{tripId.slice(0, 12)}.csv</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-text-3 text-xs">
              <tr>
                <th className="text-left p-3">Tanggal</th>
                <th className="text-left p-3">Deskripsi</th>
                <th className="text-left p-3">Kategori</th>
                <th className="text-left p-3">Bayar</th>
                <th className="text-right p-3">Nominal</th>
                <th className="p-3">Struk</th>
              </tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3 mono text-xs">{t.date}</td>
                  <td className="p-3">{t.description}</td>
                  <td className="p-3 text-xs">{t.category}</td>
                  <td className="p-3">{payerNames[t.payer_id] ?? '-'}</td>
                  <td className="p-3 text-right mono">Rp {formatRupiah(t.approved_amount ?? t.amount)}</td>
                  <td className="p-3 text-center">{t.receipt_url ? '✓' : '—'}</td>
                </tr>
              ))}
              <tr className="bg-bg-2 font-semibold">
                <td colSpan={4} className="p-3">TOTAL</td>
                <td className="p-3 text-right mono text-warm">Rp {formatRupiah(total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-bg-1 border border-border rounded-lg p-4 text-xs">
        <div className="font-medium mb-1 text-text-2">Catatan</div>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Hanya transaksi reimbursable yang sudah <b>disetujui</b> yang masuk ke export.</li>
          <li>Excel + PDF belum tersedia di v1 (defer).</li>
          <li>{receiptCount} dari {list.length} item punya foto struk.</li>
        </ul>
      </div>
    </div>
  );
}
