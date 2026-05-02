'use client';
import { useState, useMemo } from 'react';
import { Avatar } from './Avatar';
import { CATEGORIES } from '@/lib/validation/transaction';
import { formatRupiah } from '@/lib/utils';
import { Search, Bolt } from '@/components/icons';
import { Input } from '@/components/ui/input';

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

export function TransactionList({ transactions, participants }: { transactions: Tx[]; participants: Participant[] }) {
  const [filter, setFilter] = useState<'all' | 'reimburse'>('all');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

      {Object.keys(grouped).length === 0 ? (
        <div className="p-12 text-center text-text-3 text-sm">Tidak ada transaksi.</div>
      ) : Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => {
        const sub = items.reduce((s, t) => s + t.amount, 0);
        return (
          <div key={date}>
            <div className="px-4 py-2 flex justify-between text-xs uppercase tracking-wider bg-bg-0 border-t border-border">
              <span>{date}</span>
              <span className="mono">Rp {formatRupiah(sub)}</span>
            </div>
            {items.map(tx => {
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
              return (
                <div key={tx.id} className="px-4 py-3 flex items-center gap-3 border-t border-border hover:bg-bg-2">
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
                  </div>
                  <div className="mono text-sm font-semibold shrink-0">Rp {formatRupiah(tx.amount)}</div>
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
