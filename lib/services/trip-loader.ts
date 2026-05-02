import { getAdminClient } from '@/lib/db/client';
import { redirect } from 'next/navigation';

export type TripContext = {
  trip: { id: string; name: string; location: string | null; start_date: string | null; end_date: string | null; status: 'active' | 'closed'; share_token: string };
  participants: Array<{ id: string; name: string; color: string | null }>;
};

export async function loadTripContext(tripId: string, _adminId: string): Promise<TripContext> {
  // All authenticated admins (manager + approver) can read any trip.
  // Per-trip ownership is no longer enforced; the role check happens at
  // the action layer (approve, reject, close — see lib/auth/server.ts).
  const sb = getAdminClient();
  const { data: trip } = await sb.from('trips')
    .select('id, name, location, start_date, end_date, status, share_token, created_by')
    .eq('id', tripId)
    .single();
  if (!trip) redirect('/dashboard');
  void _adminId;

  const { data: parts } = await sb.from('participants')
    .select('id, name, color')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  return {
    trip: {
      id: trip.id, name: trip.name, location: trip.location,
      start_date: trip.start_date, end_date: trip.end_date,
      status: trip.status as 'active' | 'closed', share_token: trip.share_token,
    },
    participants: parts ?? [],
  };
}

export async function loadTransactions(tripId: string) {
  const sb = getAdminClient();
  const { data } = await sb.from('transactions')
    .select(`
      *,
      transaction_participants(participant_id),
      created_by_user:users!transactions_created_by_user_id_fkey(email, role),
      created_by_participant:participants!transactions_created_by_participant_id_fkey(name),
      reviewer:users!transactions_reviewed_by_fkey(email, role)
    `)
    .eq('trip_id', tripId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  return data ?? [];
}
