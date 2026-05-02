import { getAdminClient } from '@/lib/db/client';
import { ApiError } from '@/lib/errors';

export async function resolveShareToken(token: string): Promise<{
  trip_id: string;
  status: 'active' | 'closed';
}> {
  const sb = getAdminClient();
  const { data } = await sb.from('trips')
    .select('id, status')
    .eq('share_token', token)
    .maybeSingle();
  if (!data) throw new ApiError('NOT_FOUND', 404, 'Link trip tidak valid');
  return { trip_id: data.id, status: data.status as 'active' | 'closed' };
}

export async function requireActiveTrip(token: string): Promise<string> {
  const t = await resolveShareToken(token);
  if (t.status === 'closed') throw new ApiError('TRIP_CLOSED', 403, 'Trip sudah ditutup');
  return t.trip_id;
}
