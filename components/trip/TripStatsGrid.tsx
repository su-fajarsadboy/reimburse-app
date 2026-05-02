import { Wallet, Bolt, Users } from '@/components/icons';
import { formatRupiah } from '@/lib/utils';

type Tx = { amount: number; is_reimbursable: boolean };

export function TripStatsGrid({ transactions, participantsCount }: { transactions: Tx[]; participantsCount: number }) {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const reimb = transactions.filter(t => t.is_reimbursable).reduce((s, t) => s + t.amount, 0);
  const perPerson = participantsCount > 0 ? Math.round(total / participantsCount) : 0;
  const stats = [
    { icon: Wallet, label: 'Total Trip', value: total, sub: `${transactions.length} transaksi · ${participantsCount} peserta` },
    { icon: Bolt, label: 'Reimbursable', value: reimb, sub: `${transactions.filter(t => t.is_reimbursable).length} dari ${transactions.length}`, accent: 'text-warm' },
    { icon: Users, label: 'Per Orang (Rata)', value: perPerson, sub: 'Estimasi share rata' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-bg-1 border border-border rounded-lg p-4">
          <div className="text-xs flex items-center gap-1.5 mb-2"><s.icon size={11} /> {s.label}</div>
          <div className={`text-2xl font-semibold mono ${s.accent ?? ''}`}>Rp {formatRupiah(s.value)}</div>
          <div className="text-xs mt-1">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
