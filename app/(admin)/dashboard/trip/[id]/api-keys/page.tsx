import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/nextauth';
import { Topbar } from '@/components/layout/Topbar';
import { loadTripContext } from '@/lib/services/trip-loader';
import { getAdminClient } from '@/lib/db/client';
import { ApiKeyManager } from '@/components/trip/ApiKeyManager';

export default async function ApiKeysPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const ctx = await loadTripContext(id, session.user.id);
  const sb = getAdminClient();
  const { data } = await sb.from('api_keys')
    .select('id, key_prefix, label, last_used_at, revoked_at, created_at')
    .eq('trip_id', id)
    .order('created_at', { ascending: false });
  return (
    <div className="flex flex-col flex-1">
      <Topbar crumb={`Trip · ${ctx.trip.name}`} title="API Keys" />
      <div className="p-4 md:p-6">
        <ApiKeyManager tripId={id} initialKeys={data ?? []} />
      </div>
    </div>
  );
}
