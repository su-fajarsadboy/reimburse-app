'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { CATEGORIES } from '@/lib/validation/transaction';
import { formatRupiah } from '@/lib/utils';
import { Search, Bolt, Pencil, Trash2, Check, X } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CATEGORY_LABEL: Record<string, string> = {
  transport: 'Transport', makan: 'Makan', logistik: 'Logistik',
  sewa_alat: 'Sewa Alat', tiket: 'Tiket', lain: 'Lain-lain',
};

const CATEGORY_COLOR: Record<string, string> = {
  transport: 'oklch(0.72 0.15 250)', makan: 'oklch(0.78 0.14 60)',
  logistik: 'oklch(0.74 0.15 155)', sewa_alat: 'oklch(0.7 0.16 320)',
  tiket: 'oklch(0.7 0.16 200)', lain: 'oklch(0.6 0.04 250)',
};

type Tx = {
  id: string; date: string; time: string | null; description: string;
  amount: number; category: string; payer_id: string;
  is_reimbursable: boolean; receipt_url: string | null;
  status?: 'pending' | 'approved' | 'rejected' | string;
  source?: string | null;
  created_by_user?: { email: string; role?: string } | null;
  created_by_participant?: { name: string } | null;
  reviewer?: { email: string; role?: string } | null;
};

type Participant = { id: string; name: string; color: string | null };

type EditDraft = {
  description: string;
  amount: string;
  category: string;
  payer_id: string;
  date: string;
  is_reimbursable: boolean;
};

export function TransactionList({
  tripId,
  transactions,
  participants,
}: {
  /** When set, each row exposes inline edit + delete (admin-side). */
  tripId?: string;
  transactions: Tx[];
  participants: Participant[];
}) {
  const adminMode = Boolean(tripId);
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'reimburse'>('all');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; msg: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);

  const partMap = useMemo(() => Object.fromEntries(participants.map(p => [p.id, p])), [participants]);

  const filtered = transactions.filter(t => {
    if (filter === 'reimburse' && !t.is_reimbursable) return false;
    if (catFilter && t.category !== catFilter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, Tx[]>>((acc, t) => {
    (acc[t.date] = acc[t.date] || []).push(t); return acc;
  }, {});

  function startEdit(tx: Tx) {
    if (!adminMode) return;
    setEditingId(tx.id);
    setErrorId(null);
    setDraft({
      description: tx.description,
      amount: String(tx.amount),
      category: tx.category,
      payer_id: tx.payer_id,
      date: tx.date,
      is_reimbursable: tx.is_reimbursable,
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setErrorId(null);
  }

  async function saveEdit(txnId: string) {
    if (!draft) return;
    const amount = Number(draft.amount.replace(/[^\d]/g, ''));
    if (!draft.description.trim()) { setErrorId({ id: txnId, msg: 'Deskripsi wajib' }); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setErrorId({ id: txnId, msg: 'Nominal harus > 0' }); return; }

    setBusyId(txnId);
    setErrorId(null);
    try {
      const r = await fetch(`/api/admin/trips/${tripId}/transactions/${txnId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          description: draft.description.trim(),
          amount,
          category: draft.category,
          payer_id: draft.payer_id,
          date: draft.date,
          is_reimbursable: draft.is_reimbursable,
        }),
      });
      const body = await r.json();
      if (!r.ok || !body.success) {
        setErrorId({ id: txnId, msg: body.error?.message ?? 'Gagal update' });
        return;
      }
      cancelEdit();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function moveToDate(txnId: string, currentDate: string, newDate: string) {
    if (!adminMode || newDate === currentDate) return;
    setBusyId(txnId);
    setErrorId(null);
    try {
      const r = await fetch(`/api/admin/trips/${tripId}/transactions/${txnId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: newDate }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body.success === false) {
        setErrorId({ id: txnId, msg: body.error?.message ?? 'Gagal pindah tanggal' });
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
      setDraggingId(null);
      setDropDate(null);
    }
  }

  async function deleteTx(txnId: string, description: string) {
    const ok = confirm(`Hapus transaksi "${description}"? Aksi ini tidak bisa dibatalkan.`);
    if (!ok) return;
    setBusyId(txnId);
    setErrorId(null);
    try {
      const r = await fetch(`/api/admin/trips/${tripId}/transactions/${txnId}`, {
        method: 'DELETE',
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body.success === false) {
        setErrorId({ id: txnId, msg: body.error?.message ?? 'Gagal hapus' });
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-bg-1 border border-border rounded-lg">
      <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari deskripsi…" className="pl-8" />
        </div>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-1.5 border-b border-border">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>Semua</Pill>
        <Pill active={filter === 'reimburse'} onClick={() => setFilter('reimburse')}><Bolt size={11} /> Reimbursable</Pill>
        <span className="w-px self-stretch bg-border mx-1" />
        {CATEGORIES.map(c => (
          <Pill key={c} active={catFilter === c} onClick={() => setCatFilter(catFilter === c ? null : c)}>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: CATEGORY_COLOR[c] }} />
            {CATEGORY_LABEL[c]}
          </Pill>
        ))}
      </div>

      {adminMode && (
        <div className="px-4 py-2 text-[10px] text-text-3 border-t border-border bg-bg-0">
          Tip: tarik baris transaksi ke header tanggal lain untuk memindahkannya.
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="p-12 text-center text-text-3 text-sm">Tidak ada transaksi.</div>
      ) : Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => {
        const sub = items.reduce((s, t) => s + t.amount, 0);
        const isDropTarget = dropDate === date && draggingId !== null;
        return (
          <div key={date}>
            <div
              className={`px-4 py-2 flex justify-between text-xs uppercase tracking-wider bg-bg-0 border-t border-border transition ${
                isDropTarget ? 'ring-2 ring-primary bg-primary-soft' : ''
              }`}
              onDragOver={(e) => {
                if (!adminMode || !draggingId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dropDate !== date) setDropDate(date);
              }}
              onDragLeave={() => {
                if (dropDate === date) setDropDate(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const txnId = e.dataTransfer.getData('text/plain');
                if (!txnId) return;
                const tx = transactions.find((t) => t.id === txnId);
                if (!tx) return;
                void moveToDate(txnId, tx.date, date);
              }}
            >
              <span>
                {isDropTarget ? `↓ Pindah ke ${date}` : date}
              </span>
              <span className="mono">Rp {formatRupiah(sub)}</span>
            </div>
            {items.map(tx => {
              const isEditing = editingId === tx.id;
              const isBusy = busyId === tx.id;
              const error = errorId?.id === tx.id ? errorId.msg : null;

              if (isEditing && draft) {
                return (
                  <div key={tx.id} data-txn-id={tx.id} className="px-4 py-3 border-t border-border bg-bg-2/40 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <Input
                        className="md:col-span-5"
                        value={draft.description}
                        onChange={e => setDraft(d => d && ({ ...d, description: e.target.value }))}
                        placeholder="Deskripsi"
                      />
                      <Input
                        className="md:col-span-2"
                        type="text"
                        inputMode="numeric"
                        value={draft.amount}
                        onChange={e => setDraft(d => d && ({ ...d, amount: e.target.value }))}
                        placeholder="Nominal"
                      />
                      <select
                        className="md:col-span-2 h-9 px-2 rounded-md border border-border bg-bg-input text-sm"
                        value={draft.category}
                        onChange={e => setDraft(d => d && ({ ...d, category: e.target.value }))}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                        ))}
                      </select>
                      <select
                        className="md:col-span-2 h-9 px-2 rounded-md border border-border bg-bg-input text-sm"
                        value={draft.payer_id}
                        onChange={e => setDraft(d => d && ({ ...d, payer_id: e.target.value }))}
                      >
                        {participants.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <Input
                        className="md:col-span-1"
                        type="date"
                        value={draft.date}
                        onChange={e => setDraft(d => d && ({ ...d, date: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={draft.is_reimbursable}
                          onChange={e => setDraft(d => d && ({ ...d, is_reimbursable: e.target.checked }))}
                        />
                        Tandai sebagai reimbursable
                      </label>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isBusy}>
                          <X size={14} /> Batal
                        </Button>
                        <Button size="sm" onClick={() => saveEdit(tx.id)} disabled={isBusy}>
                          <Check size={14} /> {isBusy ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                      </div>
                    </div>
                    {error && <div className="text-xs text-danger">{error}</div>}
                  </div>
                );
              }

              const payer = partMap[tx.payer_id];
              const submitterLabel =
                tx.created_by_user?.email
                  ? `Diinput admin ${tx.created_by_user.email.split('@')[0]}`
                  : tx.created_by_participant?.name
                    ? `Diinput peserta ${tx.created_by_participant.name}`
                    : tx.source === 'api' ? 'Diinput AI agent' : null;
              const reviewerLabel = tx.reviewer?.email
                ? `${tx.status === 'approved' ? 'Disetujui' : tx.status === 'rejected' ? 'Ditolak' : 'Direview'} oleh ${tx.reviewer.email.split('@')[0]}`
                : null;

              const isDragging = draggingId === tx.id;
              return (
                <div
                  key={tx.id}
                  data-txn-id={tx.id}
                  draggable={adminMode && !isEditing && !isBusy}
                  onDragStart={(e) => {
                    if (!adminMode) return;
                    e.dataTransfer.setData('text/plain', tx.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggingId(tx.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropDate(null);
                  }}
                  className={`group px-4 py-3 flex items-center gap-3 border-t border-border hover:bg-bg-2 transition ${
                    adminMode ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${isDragging ? 'opacity-40' : ''}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLOR[tx.category] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tx.description}</div>
                    <div className="text-xs flex items-center gap-2 mt-0.5 flex-wrap">
                      {payer && <span className="flex items-center gap-1"><Avatar name={payer.name} color={payer.color} size={14} /> {payer.name}</span>}
                      <span>·</span>
                      <span>{CATEGORY_LABEL[tx.category]}</span>
                      {tx.time && <><span>·</span><span>{tx.time}</span></>}
                      {tx.is_reimbursable && <span className="px-1.5 py-0.5 rounded bg-warm-soft text-warm text-[10px]"><Bolt size={9} /> Reimburse</span>}
                    </div>
                    {(submitterLabel || reviewerLabel) && (
                      <div className="text-[10px] text-text-3 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        {submitterLabel && <span>{submitterLabel}</span>}
                        {reviewerLabel && <span className="text-success">· {reviewerLabel}</span>}
                      </div>
                    )}
                    {error && <div className="text-[11px] text-danger mt-1">{error}</div>}
                  </div>
                  <div className="mono text-sm font-semibold shrink-0">Rp {formatRupiah(tx.amount)}</div>
                  {adminMode && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => startEdit(tx)}
                        disabled={isBusy}
                        aria-label={`Edit ${tx.description}`}
                        className="p-1.5 rounded-md text-text-3 hover:bg-bg-3 hover:text-text-1 disabled:opacity-50"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTx(tx.id, tx.description)}
                        disabled={isBusy}
                        aria-label={`Hapus ${tx.description}`}
                        className="p-1.5 rounded-md text-text-3 hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition ${
        active ? 'bg-primary-soft text-text-1 border-primary' : 'bg-bg-2 text-text-3 border-border hover:text-text-1'
      }`}>
      {children}
    </button>
  );
}
