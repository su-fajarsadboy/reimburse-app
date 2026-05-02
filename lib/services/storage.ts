import sharp from 'sharp';
import { getAdminClient } from '@/lib/db/client';
import { ApiError } from '@/lib/errors';
import { nano } from '@/lib/utils';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'receipts';

export async function uploadReceipt(input: {
  buffer: Buffer;
  mimeType: string;
  tripId: string;
}): Promise<{ url: string; key: string }> {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new ApiError('UPLOAD_ERROR', 422, `MIME type tidak didukung: ${input.mimeType}`);
  }
  if (input.buffer.length > MAX_BYTES) {
    throw new ApiError('UPLOAD_ERROR', 422, `Ukuran file melebihi 5MB`);
  }

  const compressed = await sharp(input.buffer)
    .rotate()
    .resize(1920, null, { withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  const key = `${input.tripId}/${nano.n21()}.jpg`;
  const sb = getAdminClient();
  const { error } = await sb.storage.from(BUCKET).upload(key, compressed, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new ApiError('UPLOAD_ERROR', 500, `Storage upload gagal: ${error.message}`);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
  return { url: data.publicUrl, key };
}
