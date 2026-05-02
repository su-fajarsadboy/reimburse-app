import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/nextauth';
import { Topbar } from '@/components/layout/Topbar';
import { loadTripContext, loadTransactions } from '@/lib/services/trip-loader';
import { TripStatsGrid } from '@/components/trip/TripStatsGrid';
import { TransactionList } from '@/components/trip/TransactionList';
import { NewTxnButton } from '@/components/trip/TripPageClient';

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const ctx = await loadTripContext(id, session.user.id);
  const txns = await loadTransactions(id);

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        crumb={`Trip · ${ctx.trip.name}`}
        title="Semua Pengeluaran"
        actions={<NewTxnButton tripId={id} participants={ctx.participants} />}
      />
      <div className="p-4 md:p-6 flex flex-col gap-4">
        <TripStatsGrid transactions={txns} participantsCount={ctx.participants.length} />
        <TransactionList transactions={txns} participants={ctx.participants} />
      </div>
    </div>
  );
}
