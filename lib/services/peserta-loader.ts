import { getAdminClient } from '@/lib/db/client';

export async function loadPesertaTrip(shareToken: string) {
  const sb = getAdminClient();
  const { data: trip } = await sb.from('trips')
    .select('id, name, location, start_date, end_date, status, share_token')
    .eq('share_token', shareToken)
    .maybeSingle();
  if (!trip) return null;
  const { data: parts } = await sb.from('participants')
    .select('id, name, color').eq('trip_id', trip.id).order('created_at', { ascending: true });
  const { data: txns } = await sb.from('transactions')
    .select('*, transaction_participants(participant_id)')
    .eq('trip_id', trip.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  return { trip, participants: parts ?? [], transactions: txns ?? [] };
}
