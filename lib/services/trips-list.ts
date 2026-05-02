import { getAdminClient } from '@/lib/db/client';

export async function listTrips(adminId: string) {
  const sb = getAdminClient();
  const { data } = await sb.from('trips')
    .select('id, name, location, start_date, end_date, status, created_at')
    .eq('created_by', adminId)
    .order('created_at', { ascending: false });
  return data ?? [];
}
