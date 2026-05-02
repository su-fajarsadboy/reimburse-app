import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import { listTrips } from '@/lib/services/trips-list';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Plus } from '@/components/icons';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const trips = await listTrips(session.user.id);

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar
        crumb="Admin"
        title="Trip Saya"
        actions={
          <Link href="/dashboard/trip/new">
            <Button><Plus size={16} /> Trip Baru</Button>
          </Link>
        }
      />
      <div className="p-4 md:p-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {trips.length === 0 ? (
          <div className="col-span-full text-center py-16 text-text-3">
            Belum ada trip. Klik "Trip Baru" untuk mulai.
          </div>
        ) : trips.map(t => (
          <Link key={t.id} href={`/dashboard/trip/${t.id}`}
            className="block bg-bg-1 border border-border rounded-lg p-4 hover:bg-bg-2 transition">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'active' ? 'bg-success/20 text-success' : 'bg-bg-3 text-text-3'}`}>
                {t.status === 'active' ? 'Aktif' : 'Ditutup'}
              </span>
              <span className="text-xs">{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
            </div>
            <h3 className="font-semibold mb-1">{t.name}</h3>
            {t.location && <div className="text-xs">{t.location}</div>}
            {t.start_date && t.end_date && (
              <div className="text-xs mt-1">{t.start_date} → {t.end_date}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
