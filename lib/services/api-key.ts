import bcrypt from 'bcryptjs';
import { getAdminClient } from '@/lib/db/client';
import { nano } from '@/lib/utils';

export type ApiKeyRecord = {
  id: string;
  trip_id: string;
  key_prefix: string;
  label: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export async function generateApiKey(params: {
  tripId: string;
  label?: string;
}): Promise<{ plain: string; record: ApiKeyRecord }> {
  const random32 = nano.n32();
  const plain = `ctx_live_${random32}`;
  const keyPrefix = plain.slice(0, 17); // "ctx_live_" + 8 chars
  const keyHash = await bcrypt.hash(plain, 10);

  const sb = getAdminClient();
  const { data, error } = await sb
    .from('api_keys')
    .insert({
      trip_id: params.tripId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label: params.label ?? null,
    })
    .select('id, trip_id, key_prefix, label, last_used_at, revoked_at, created_at')
    .single();

  if (error || !data) throw new Error(`Failed to insert API key: ${error?.message}`);
  return { plain, record: data };
}

export async function verifyApiKey(plain: string): Promise<{
  id: string;
  trip_id: string;
  trip_status: 'active' | 'closed';
} | null> {
  if (!plain.startsWith('ctx_live_') || plain.length !== 41) return null;
  const keyPrefix = plain.slice(0, 17);

  const sb = getAdminClient();
  const { data: candidates } = await sb
    .from('api_keys')
    .select('id, trip_id, key_hash, trips!inner(status)')
    .eq('key_prefix', keyPrefix)
    .is('revoked_at', null);

  if (!candidates || candidates.length === 0) return null;

  for (const c of candidates) {
    const ok = await bcrypt.compare(plain, c.key_hash);
    if (ok) {
      // fire-and-forget update last_used_at
      sb.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', c.id).then();
      const status = (c as unknown as { trips: { status: 'active' | 'closed' } }).trips.status;
      return { id: c.id, trip_id: c.trip_id, trip_status: status };
    }
  }
  return null;
}

export async function revokeApiKey(id: string): Promise<void> {
  const sb = getAdminClient();
  await sb.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
}
