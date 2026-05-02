import { getAdminClient } from '@/lib/db/client';

export async function listTrips(_adminId?: string) {
  // All admins (manager + approver) see all trips. The per-creator filter
  // was a single-tenant relic; our team model needs shared visibility.
  void _adminId;
  const sb = getAdminClient();
  const { data } = await sb
    .from('trips')
    .select('id, name, location, start_date, end_date, status, created_at')
    .order('created_at', { ascending: false });
  return data ?? [];
}
