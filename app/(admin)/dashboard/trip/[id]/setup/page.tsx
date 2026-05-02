import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/nextauth';
import { Topbar } from '@/components/layout/Topbar';
import { loadTripContext } from '@/lib/services/trip-loader';
import { TripSetupClient } from '@/components/trip/TripSetupClient';

export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const ctx = await loadTripContext(id, session.user.id);
  const role = session.user.role ?? 'manager';
  return (
    <div className="flex flex-col flex-1">
      <Topbar crumb={`Trip · ${ctx.trip.name}`} backHref={`/dashboard/trip/${id}`} title="Pengaturan Trip" />
      <div className="p-4 md:p-6">
        <TripSetupClient trip={ctx.trip} participants={ctx.participants} role={role} />
      </div>
    </div>
  );
}
