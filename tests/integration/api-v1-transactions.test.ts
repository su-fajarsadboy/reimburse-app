import { describe, it, expect, beforeEach } from 'vitest';
import { getAdminClient } from '@/lib/db/client';
import { generateApiKey } from '@/lib/services/api-key';
import { randomUUID } from 'node:crypto';

const sb = getAdminClient();
const BASE = 'http://localhost:3000';

async function setupTrip() {
  const { data: user } = await sb.from('users').upsert({
    email: 'apitest@local',
    password_hash: 'x',
  }, { onConflict: 'email' }).select('id').single();

  const shareToken = 'apitest_' + Math.random().toString(36).slice(2, 12);
  const { data: trip } = await sb.from('trips').insert({
    name: 'API Test', share_token: shareToken, created_by: user!.id,
  }).select('id').single();

  const { data: parts } = await sb.from('participants').insert([
    { trip_id: trip!.id, name: 'Alice' },
    { trip_id: trip!.id, name: 'Bob' },
  ]).select('id, name');

  const { plain } = await generateApiKey({ tripId: trip!.id, label: 'test' });
  return { tripId: trip!.id, key: plain, parts: parts! };
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/transactions', () => {
  let key: string, parts: Array<{ id: string; name: string }>;
  beforeEach(async () => {
    const s = await setupTrip();
    key = s.key;
    parts = s.parts;
  });

  it('happy path returns 201 with txn id', async () => {
    const r = await post('/api/v1/transactions', {
      description: 'Bensin', amount: 100000, category: 'transport',
      payer_id: parts[0].id, participant_ids: parts.map(p => p.id),
    }, {
      authorization: `Bearer ${key}`,
      'idempotency-key': randomUUID(),
    });
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toMatch(/^txn_/);
  });

  it('missing bearer → 401', async () => {
    const r = await post('/api/v1/transactions', {}, { 'idempotency-key': randomUUID() });
    expect(r.status).toBe(401);
  });

  it('missing Idempotency-Key → 400', async () => {
    const r = await post('/api/v1/transactions', {
      description: 'x', amount: 1, category: 'lain',
      payer_id: parts[0].id, participant_ids: [parts[0].id],
    }, { authorization: `Bearer ${key}` });
    expect(r.status).toBe(400);
  });

  it('invalid Idempotency-Key format → 400', async () => {
    const r = await post('/api/v1/transactions', {
      description: 'x', amount: 1, category: 'lain',
      payer_id: parts[0].id, participant_ids: [parts[0].id],
    }, { authorization: `Bearer ${key}`, 'idempotency-key': 'not-uuid' });
    expect(r.status).toBe(400);
  });

  it('replay same key + body → cached response, header set', async () => {
    const idem = randomUUID();
    const body = { description: 'Replay', amount: 1000, category: 'lain', payer_id: parts[0].id, participant_ids: [parts[0].id] };
    const r1 = await post('/api/v1/transactions', body, { authorization: `Bearer ${key}`, 'idempotency-key': idem });
    const r2 = await post('/api/v1/transactions', body, { authorization: `Bearer ${key}`, 'idempotency-key': idem });
    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.data.id).toBe(b2.data.id);
    expect(r2.headers.get('idempotent-replay')).toBe('true');
  });

  it('replay same key + different body → 409', async () => {
    const idem = randomUUID();
    await post('/api/v1/transactions', {
      description: 'A', amount: 100, category: 'lain', payer_id: parts[0].id, participant_ids: [parts[0].id],
    }, { authorization: `Bearer ${key}`, 'idempotency-key': idem });
    const r = await post('/api/v1/transactions', {
      description: 'B', amount: 200, category: 'lain', payer_id: parts[0].id, participant_ids: [parts[0].id],
    }, { authorization: `Bearer ${key}`, 'idempotency-key': idem });
    expect(r.status).toBe(409);
  });

  it('payer_id not in trip → 422', async () => {
    const r = await post('/api/v1/transactions', {
      description: 'Bad', amount: 100, category: 'lain',
      payer_id: 'part_doesnotexist', participant_ids: [parts[0].id],
    }, { authorization: `Bearer ${key}`, 'idempotency-key': randomUUID() });
    expect(r.status).toBe(422);
  });
});
