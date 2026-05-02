import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/nextauth';
import { Topbar } from '@/components/layout/Topbar';
import { loadTripContext, loadTransactions } from '@/lib/services/trip-loader';
import { ExportPanel } from '@/components/trip/ExportPanel';

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const ctx = await loadTripContext(id, session.user.id);
  const txns = await loadTransactions(id);
  const payerNames = Object.fromEntries(ctx.participants.map(p => [p.id, p.name]));
  return (
    <div className="flex flex-col flex-1">
      <Topbar crumb={`Trip · ${ctx.trip.name}`} title="Export untuk Reimburse" />
      <div className="p-4 md:p-6">
        <ExportPanel tripId={id} transactions={txns} payerNames={payerNames} />
      </div>
    </div>
  );
}
