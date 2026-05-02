import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/nextauth';
import { Topbar } from '@/components/layout/Topbar';
import { loadTripContext, loadTransactions } from '@/lib/services/trip-loader';
import { SettlementView } from '@/components/trip/SettlementView';

export default async function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const ctx = await loadTripContext(id, session.user.id);
  const txns = await loadTransactions(id);
  return (
    <div className="flex flex-col flex-1">
      <Topbar crumb={`Trip · ${ctx.trip.name}`} backHref={`/dashboard/trip/${id}`} title="Siapa Transfer ke Siapa" />
      <div className="p-4 md:p-6">
        <SettlementView participants={ctx.participants} transactions={txns} />
      </div>
    </div>
  );
}
