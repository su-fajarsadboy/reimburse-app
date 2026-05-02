import { z } from 'zod';

export const TripInput = z.object({
  name: z.string().min(1).max(100),
  location: z.string().max(200).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type TripInputT = z.infer<typeof TripInput>;
