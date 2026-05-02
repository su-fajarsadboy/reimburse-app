import { describe, it, expect, beforeEach } from 'vitest';
import { getAdminClient } from '@/lib/db/client';
import { generateApiKey, verifyApiKey, revokeApiKey } from '@/lib/services/api-key';

const sb = getAdminClient();

async function makeTrip(): Promise<string> {
  const { data: user } = await sb.from('users').upsert({
    email: 'apikeytest@local',
    password_hash: 'x',
  }, { onConflict: 'email' }).select('id').single();

  const { data: trip } = await sb.from('trips').insert({
    name: 'API Key Test Trip',
    share_token: 'sttest_' + Math.random().toString(36).slice(2, 10),
    created_by: user!.id,
  }).select('id').single();

  return trip!.id;
}

describe('api-key', () => {
  let tripId: string;

  beforeEach(async () => {
    tripId = await makeTrip();
  });

  it('generates a key with ctx_live_ prefix and 17-char prefix stored', async () => {
    const { plain, record } = await generateApiKey({ tripId, label: 'test' });
    expect(plain).toMatch(/^ctx_live_[A-Za-z0-9]{32}$/);
    expect(record.key_prefix).toBe(plain.slice(0, 17));
  });

  it('verifies a valid key', async () => {
    const { plain } = await generateApiKey({ tripId, label: 'test' });
    const result = await verifyApiKey(plain);
    expect(result).not.toBeNull();
    expect(result!.trip_id).toBe(tripId);
  });

  it('rejects wrong key', async () => {
    await generateApiKey({ tripId });
    const wrong = 'ctx_live_' + 'x'.repeat(32);
    expect(await verifyApiKey(wrong)).toBeNull();
  });

  it('rejects revoked key', async () => {
    const { plain, record } = await generateApiKey({ tripId });
    await revokeApiKey(record.id);
    expect(await verifyApiKey(plain)).toBeNull();
  });
});
