import { z } from './zod-init';

export const CATEGORIES = ['transport', 'makan', 'logistik', 'sewa_alat', 'tiket', 'lain'] as const;

export const TransactionInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format harus YYYY-MM-DD').optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Format harus HH:MM').optional(),
  description: z.string().min(1, 'Deskripsi wajib').max(200, 'Maksimum 200 karakter'),
  amount: z.number().int().positive('Nominal harus > 0'),
  currency: z.literal('IDR').default('IDR'),
  category: z.enum(CATEGORIES, { message: 'Kategori tidak valid' }),
  payer_id: z.string().min(1),
  participant_ids: z.array(z.string().min(1)).min(1, 'Minimal 1 peserta').max(10, 'Maksimum 10 peserta'),
  is_reimbursable: z.boolean().default(false),
  receipt_url: z.string().url().optional(),
  notes: z.string().max(500).optional(),
  source: z.string().max(50).default('manual'),
});

export type TransactionInputT = z.infer<typeof TransactionInput>;

export const TransactionUpdate = TransactionInput.partial().omit({
  source: true,
});

export const ApprovalInput = z.object({
  approved_amount: z.number().int().nonnegative(),
  review_note: z.string().max(500).optional(),
});
