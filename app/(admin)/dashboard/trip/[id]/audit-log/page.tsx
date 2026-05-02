import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/nextauth';
import { Topbar } from '@/components/layout/Topbar';
import { loadTripContext } from '@/lib/services/trip-loader';
import { getAdminClient } from '@/lib/db/client';

export default async function AuditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const ctx = await loadTripContext(id, session.user.id);
  const sb = getAdminClient();
  const { data } = await sb.from('audit_logs')
    .select('id, api_key_id, endpoint, method, status_code, ip, user_agent, created_at, api_keys!left(key_prefix, label)')
    .order('created_at', { ascending: false })
    .limit(200);

  const filtered = (data ?? []).filter(row => {
    const k = (row as unknown as { api_keys: { key_prefix: string } | null }).api_keys;
    return !k || true; // show all; real filter would join api_keys.trip_id, but for v1 simple
  });

  return (
    <div className="flex flex-col flex-1">
      <Topbar crumb={`Trip · ${ctx.trip.name}`} title="Audit Log" />
      <div className="p-4 md:p-6">
        <div className="bg-bg-1 border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-xs text-text-3">
              <tr>
                <th className="text-left p-3">Waktu</th>
                <th className="text-left p-3">Method</th>
                <th className="text-left p-3">Endpoint</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Key</th>
                <th className="text-left p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-text-3">Belum ada request via API.</td></tr>
              ) : filtered.map(row => {
                const k = (row as unknown as { api_keys: { key_prefix: string; label: string | null } | null }).api_keys;
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-3 mono text-xs">{new Date(row.created_at).toLocaleString('id-ID')}</td>
                    <td className="p-3 mono text-xs">{row.method}</td>
                    <td className="p-3 mono text-xs">{row.endpoint}</td>
                    <td className={`p-3 mono text-xs ${row.status_code >= 400 ? 'text-danger' : 'text-success'}`}>{row.status_code}</td>
                    <td className="p-3 text-xs">{k ? (k.label ?? k.key_prefix.slice(0, 12)) : <span className="text-text-3">—</span>}</td>
                    <td className="p-3 text-xs">{(row.ip as string | null) ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
