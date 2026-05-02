'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Bolt, Receipt as ReceiptIcon } from '@/components/icons';

type Participant = { id: string; name: string; color: string | null };
type Tx = {
  id: string; description: string; date: string; time: string | null;
  amount: number; category: string; payer_id: string;
  is_reimbursable: boolean; receipt_url: string | null; notes: string | null;
  status: 'pending' | 'approved' | 'rejected'; approved_amount: number | null;
  reviewed_by: string | null; reviewed_at: string | null; review_note: string | null;
};

export function ApprovalCenter({ tripId, transactions, participants }: {
  tripId: string; transactions: Tx[]; participants: Participant[];
}) {
  const reimbList = transactions.filter(t => t.is_reimbursable);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const filtered = reimbList.filter(t => filter === 'all' ? true : t.status === filter);
  const active = transactions.find(t => t.id === activeId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (filtered.length > 0 && (!active || !filtered.find(t => t.id === active.id))) {
      setActiveId(filtered[0]?.id ?? null);
    }
  }, [filter, transactions]);

  const partMap = useMemo(() => Object.fromEntries(participants.map(p => [p.id, p])), [participants]);

  const stats = {
    pending: reimbList.filter(t => t.status === 'pending').length,
    approved: reimbList.filter(t => t.status === 'approved').length,
    rejected: reimbList.filter(t => t.status === 'rejected').length,
    pendingAmt: reimbList.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0),
    approvedAmt: reimbList.filter(t => t.status === 'approved').reduce((s, t) => s + (t.approved_amount ?? t.amount), 0),
  };

  async function approveOne(tx: Tx, amount: number, note: string) {
    await fetch(`/api/admin/trips/${tripId}/transactions/${tx.id}/approve`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved_amount: amount, review_note: note }),
    });
    router.refresh();
  }
  async function rejectOne(tx: Tx, note: string) {
    await fetch(`/api/admin/trips/${tripId}/transactions/${tx.id}/reject`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ review_note: note }),
    });
    router.refresh();
  }
  async function resetOne(tx: Tx) {
    await fetch(`/api/admin/trips/${tripId}/transactions/${tx.id}/reset`, { method: 'POST' });
    router.refresh();
  }
  async function bulkApprove() {
    await fetch(`/api/admin/trips/${tripId}/transactions/bulk-approve`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ txn_ids: [...selected] }),
    });
    setSelected(new Set());
    router.refresh();
  }

  const toggleSel = (id: string) => setSelected(s => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-bg-1 border border-border rounded-lg p-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-text-3">Approval Center</div>
          <div className="text-xl font-semibold">{stats.pending} pengajuan menunggu</div>
          <div className="text-xs">Total Rp {formatRupiah(stats.pendingAmt)} · {reimbList.length} reimbursable</div>
        </div>
        <div className="text-right">
          <div className="mono text-2xl font-semibold">{stats.approved}<span className="text-text-3 text-base">/{reimbList.length}</span></div>
          <div className="text-xs">Disetujui · Rp {formatRupiah(stats.approvedAmt)}</div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bg-warm-soft border border-warm-soft rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm">{selected.size} item terpilih</div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Batal</Button>
            <Button size="sm" onClick={bulkApprove}><Check size={14} /> Approve Semua</Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_minmax(0,1.4fr)] gap-4">
        {/* List */}
        <div className="bg-bg-1 border border-border rounded-lg flex flex-col">
          <div className="p-3 border-b border-border flex flex-wrap gap-1.5">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs border transition ${filter === f ? 'bg-primary-soft border-primary' : 'bg-bg-2 border-border text-text-3'}`}>
                {f === 'pending' ? 'Pending' : f === 'approved' ? 'Disetujui' : f === 'rejected' ? 'Ditolak' : 'Semua'}
                <span className="ml-1.5 text-text-3">
                  {f === 'all' ? reimbList.length : stats[f as 'pending' | 'approved' | 'rejected']}
                </span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-text-3 text-sm">Tidak ada item.</div>
            ) : filtered.map(tx => {
              const payer = partMap[tx.payer_id];
              const isActive = active?.id === tx.id;
              const isSel = selected.has(tx.id);
              return (
                <div key={tx.id} onClick={() => setActiveId(tx.id)}
                  className={`p-3 border-b border-border flex gap-3 cursor-pointer hover:bg-bg-2 ${isActive ? 'bg-bg-2' : ''}`}>
                  <button onClick={e => { e.stopPropagation(); toggleSel(tx.id); }}
                    className={`w-5 h-5 rounded border ${isSel ? 'bg-primary border-primary' : 'border-border'} shrink-0 flex items-center justify-center`}>
                    {isSel && <Check size={12} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm truncate">{tx.description}</span>
                      <span className="mono text-sm shrink-0">Rp {formatRupiah(tx.approved_amount ?? tx.amount)}</span>
                    </div>
                    <div className="text-xs flex items-center gap-2 mt-1">
                      {payer && <span className="flex items-center gap-1"><Avatar name={payer.name} color={payer.color} size={14} /> {payer.name}</span>}
                      <span>·</span><span>{tx.date}</span>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        tx.status === 'pending' ? 'bg-warm-soft text-warm' :
                        tx.status === 'approved' ? 'bg-success/20 text-success' : 'bg-danger-soft text-danger'
                      }`}>
                        {tx.status === 'pending' ? 'Menunggu' : tx.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                      {tx.receipt_url && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-3 text-text-3"><ReceiptIcon size={10} /> Struk</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="bg-bg-1 border border-border rounded-lg p-5">
          {active ? (
            <ApprovalDetail tx={active} payer={partMap[active.payer_id]}
              onApprove={(amt, note) => approveOne(active, amt, note)}
              onReject={note => rejectOne(active, note)}
              onReset={() => resetOne(active)} />
          ) : (
            <div className="text-center text-text-3 py-12">Pilih item untuk review</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalDetail({ tx, payer, onApprove, onReject, onReset }: {
  tx: Tx; payer: Participant | undefined;
  onApprove: (amt: number, note: string) => void;
  onReject: (note: string) => void;
  onReset: () => void;
}) {
  const [adj, setAdj] = useState(tx.approved_amount ?? tx.amount);
  const [note, setNote] = useState(tx.review_note ?? '');

  useEffect(() => {
    setAdj(tx.approved_amount ?? tx.amount);
    setNote(tx.review_note ?? '');
  }, [tx.id]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">{tx.description}</div>
        {tx.notes && <div className="text-xs italic mt-1">"{tx.notes}"</div>}
        <div className="text-xs mt-2">
          {payer && <span className="inline-flex items-center gap-1.5"><Avatar name={payer.name} color={payer.color} size={16} /> {payer.name}</span>}
          <span className="mx-2">·</span><span>{tx.date} {tx.time ?? ''}</span>
        </div>
      </div>

      {tx.receipt_url && (
        <a href={tx.receipt_url} target="_blank" rel="noreferrer" className="block">
          <img src={tx.receipt_url} alt="Struk" className="max-h-64 object-contain rounded border border-border" />
        </a>
      )}

      <div className="bg-bg-2 border border-border rounded p-3">
        <div className="flex justify-between text-xs">
          <span>Diajukan</span>
          <span className={`mono ${adj !== tx.amount ? 'line-through text-text-3' : ''}`}>Rp {formatRupiah(tx.amount)}</span>
        </div>
        <div className="text-xs mt-2">Disetujui</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-text-3 mono">Rp</span>
          <input type="text" inputMode="numeric" value={formatRupiah(adj)}
            onChange={e => setAdj(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
            className="bg-bg-input border border-border rounded px-2 py-1 mono w-full" />
          <span className="text-xs mono shrink-0">{Math.round((adj / tx.amount) * 100)}%</span>
        </div>
        <div className="mt-2">
          <Slider min={0} max={Math.round(tx.amount * 1.2)} step={1000}
            value={[adj]} onValueChange={v => setAdj(v[0])} />
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 50, 75, 100].map(p => (
            <button key={p} onClick={() => setAdj(Math.round(tx.amount * p / 100))}
              className="text-xs px-2 py-0.5 rounded border border-border bg-bg-1 hover:bg-bg-3">{p}%</button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs mb-1">Catatan reviewer (opsional)</div>
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Cth: Disesuaikan karena tarif tol berbeda" />
      </div>

      {tx.status === 'pending' ? (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 text-danger border-danger" onClick={() => onReject(note)}>
            <X size={14} /> Tolak
          </Button>
          <Button className="flex-[2]" onClick={() => onApprove(adj, note)}>
            <Check size={14} /> Approve {adj !== tx.amount ? `Rp ${formatRupiah(adj)}` : ''}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-bg-2 border border-border rounded p-3">
          <div className="text-sm">
            {tx.status === 'approved' ? `Disetujui Rp ${formatRupiah(tx.approved_amount ?? tx.amount)}` : 'Ditolak'}
            <div className="text-xs">{tx.reviewed_at ?? ''}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onReset}>Reset ke pending</Button>
        </div>
      )}
    </div>
  );
}
