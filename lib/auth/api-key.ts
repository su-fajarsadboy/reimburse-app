import { verifyApiKey } from '@/lib/services/api-key';
import { ApiError } from '@/lib/errors';

export async function requireBearer(req: Request): Promise<{
  apiKeyId: string;
  tripId: string;
}> {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new ApiError('INVALID_AUTH', 401, 'Authorization Bearer header diperlukan');
  }
  const plain = auth.slice(7).trim();
  const result = await verifyApiKey(plain);
  if (!result) throw new ApiError('INVALID_AUTH', 401, 'API key invalid');
  if (result.trip_status === 'closed') throw new ApiError('TRIP_CLOSED', 403, 'Trip sudah ditutup');
  return { apiKeyId: result.id, tripId: result.trip_id };
}
