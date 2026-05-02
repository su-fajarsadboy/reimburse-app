import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/nextauth';
import { Topbar } from '@/components/layout/Topbar';
import { loadTripContext, loadTransactions } from '@/lib/services/trip-loader';
import { ApprovalCenter } from '@/components/trip/ApprovalCenter';
import type { ComponentProps } from 'react';

type Tx = ComponentProps<typeof ApprovalCenter>['transactions'][number];

export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const role = session.user.role ?? 'manager';
  const { id } = await params;
  const ctx = await loadTripContext(id, session.user.id);

  if (role !== 'approver') {
    return (
      <div className="flex flex-col flex-1">
        <Topbar crumb={`Trip · ${ctx.trip.name}`} title="Approval Center" />
        <div className="p-4 md:p-6">
          <div className="bg-bg-1 border border-border rounded-lg p-8 text-center max-w-md mx-auto">
            <div className="text-base font-semibold mb-1">Akses ditolak</div>
            <p className="text-sm text-text-3">
              Approval Center hanya bisa diakses oleh role <strong className="text-text-1">approver</strong>.
              Hubungi admin yang punya akses approver untuk menyetujui transaksi reimbursable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const txns = (await loadTransactions(id)) as unknown as Tx[];
  const pending = txns.filter(t => t.is_reimbursable && t.status === 'pending').length;

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        crumb={`Trip · ${ctx.trip.name}`}
        title="Approval Center"
        actions={<span className="text-xs px-2 py-1 rounded bg-warm-soft text-warm">{pending} pending</span>}
      />
      <div className="p-4 md:p-6">
        <ApprovalCenter tripId={id} transactions={txns} participants={ctx.participants} />
      </div>
    </div>
  );
}
