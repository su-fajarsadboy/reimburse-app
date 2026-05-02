import { getAdminClient } from '@/lib/db/client';
import { nano, pickColor } from '@/lib/utils';
import { ApiError } from '@/lib/errors';
import type { TripWithParticipantsT } from '@/lib/validation/participant';

export async function createTripWithParticipants(input: {
  data: TripWithParticipantsT;
  createdBy: string;
}): Promise<{ tripId: string; shareToken: string }> {
  const sb = getAdminClient();
  const shareToken = nano.n16();

  const { data: trip, error: tripErr } = await sb
    .from('trips')
    .insert({
      name: input.data.trip.name,
      location: input.data.trip.location ?? null,
      start_date: input.data.trip.start_date ?? null,
      end_date: input.data.trip.end_date ?? null,
      share_token: shareToken,
      created_by: input.createdBy,
    })
    .select('id, share_token')
    .single();

  if (tripErr || !trip) throw new ApiError('INTERNAL_ERROR', 500, `Trip insert failed: ${tripErr?.message}`);

  const partRows = input.data.participants.map((p, i) => ({
    trip_id: trip.id,
    name: p.name,
    color: pickColor(i),
  }));

  const { error: pErr } = await sb.from('participants').insert(partRows);
  if (pErr) {
    await sb.from('trips').delete().eq('id', trip.id);
    throw new ApiError('INTERNAL_ERROR', 500, `Participants insert failed: ${pErr.message}`);
  }

  return { tripId: trip.id, shareToken: trip.share_token };
}
