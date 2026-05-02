import { getAdminClient } from '@/lib/db/client';
import { redirect } from 'next/navigation';

export type TripContext = {
  trip: { id: string; name: string; location: string | null; start_date: string | null; end_date: string | null; status: 'active' | 'closed'; share_token: string };
  participants: Array<{ id: string; name: string; color: string | null }>;
};

export async function loadTripContext(tripId: string, adminId: string): Promise<TripContext> {
  const sb = getAdminClient();
  const { data: trip } = await sb.from('trips')
    .select('id, name, location, start_date, end_date, status, share_token, created_by')
    .eq('id', tripId)
    .single();
  if (!trip || trip.created_by !== adminId) redirect('/dashboard');

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
    .select('*, transaction_participants(participant_id)')
    .eq('trip_id', tripId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  return data ?? [];
}
