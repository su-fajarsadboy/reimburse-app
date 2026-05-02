import { z } from 'zod';

export const ParticipantInput = z.object({
  name: z.string().min(1).max(50),
});

export const TripWithParticipants = z.object({
  trip: z.object({
    name: z.string().min(1).max(100),
    location: z.string().max(200).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  participants: z.array(z.object({ name: z.string().min(1).max(50) }))
    .min(2, 'Minimal 2 peserta')
    .max(10, 'Maksimum 10 peserta'),
});

export type ParticipantInputT = z.infer<typeof ParticipantInput>;
export type TripWithParticipantsT = z.infer<typeof TripWithParticipants>;
