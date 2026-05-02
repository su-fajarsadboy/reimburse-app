import { z } from 'zod';

export const ApiKeyInput = z.object({
  label: z.string().max(100).optional(),
});

export type ApiKeyInputT = z.infer<typeof ApiKeyInput>;
