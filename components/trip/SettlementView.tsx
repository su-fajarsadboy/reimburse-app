'use client';
import { useState, useMemo } from 'react';
import { Avatar } from './Avatar';
import { computeBalances, computeSettlement } from '@/lib/services/settlement';
import { formatRupiah } from '@/lib/utils';
import { Check } from '@/components/icons';
import { Button } from '@/components/ui/button';

type Participant = { id: string; name: string; color: string | null };
type Tx = { amount: number; payer_id: string; transaction_participants: Array<{ participant_id: string }> };

export function SettlementView({ participants, transactions }: { participants: Participant[]; transactions: Tx[] }) {
  const txs = useMemo(() => transactions.map(t => ({
    amount: t.amount,
    payer_id: t.payer_id,
    participant_ids: t.transaction_participants.map(p => p.participant_id),
  })), [transactions]);

  const balances = useMemo(() => computeBalances(participants, txs), [participants, txs]);
  const transfers = useMemo(() => computeSettlement(participants, txs), [participants, txs]);
  const [settled, setSettled] = useState<Record<number, boolean>>({});
  const partMap = Object.fromEntries(participants.map(p => [p.id, p]));
  const maxAbs = Math.max(...Object.values(balances).map(Math.abs), 1);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div>
        <div className="mb-3">
          <div className="text-base font-semibold">Money Lanes</div>
          <div className="text-xs">Daftar transfer minimal</div>
        </div>
        <div className="space-y-2">
          {transfers.length === 0 ? (
            <div className="bg-bg-1 border border-border rounded-lg p-8 text-center text-text-3">
              Semua sudah lunas.
            </div>
          ) : transfers.map((tr, i) => {
            const from = partMap[tr.from_participant_id];
            const to = partMap[tr.to_participant_id];
            const isSettled = settled[i] ?? false;
            return (
              <div key={i} className={`bg-bg-1 border border-border rounded-lg p-4 flex items-center gap-4 ${isSettled ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2 flex-1">
                  <Avatar name={from.name} color={from.color} size={36} />
                  <div>
                    <div className="text-xs">Bayar</div>
                    <div className="font-medium">{from.name}</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="mono font-semibold">Rp {formatRupiah(tr.amount)}</div>
                  <Button variant="ghost" size="sm"
                    onClick={() => setSettled(s => ({ ...s, [i]: !s[i] }))}>
                    {isSettled ? <><Check size={12} /> Lunas</> : 'Tandai lunas'}
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <div className="text-right">
                    <div className="text-xs">Diterima</div>
                    <div className="font-medium">{to.name}</div>
                  </div>
                  <Avatar name={to.name} color={to.color} size={36} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-bg-1 border border-border rounded-lg p-4">
        <div className="text-base font-semibold mb-1">Saldo Per Orang</div>
        <div className="text-xs mb-4">Bayar (+) dikurangi share (–)</div>
        <div className="space-y-3">
          {participants.map(p => {
            const b = balances[p.id] ?? 0;
            const pct = (Math.abs(b) / maxAbs) * 50;
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Avatar name={p.name} color={p.color} size={20} /> {p.name}</span>
                  <span className={`mono ${b > 0 ? 'text-success' : b < 0 ? 'text-warm' : 'text-text-3'}`}>
                    {b > 0 ? '+' : ''}{formatRupiah(b)}
                  </span>
                </div>
                <div className="relative h-1.5 bg-bg-2 rounded">
                  <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: '50%' }} />
                  <div className={`absolute top-0 bottom-0 rounded ${b > 0 ? 'bg-success' : 'bg-warm'}`}
                    style={{ left: b >= 0 ? '50%' : `${50 - pct}%`, width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
