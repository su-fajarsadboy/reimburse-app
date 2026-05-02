import { createHash } from 'node:crypto';

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(k => JSON.stringify(k) + ':' + canonicalize((value as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

export function hashRequest(body: unknown): string {
  return createHash('sha256').update(canonicalize(body)).digest('hex');
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isValidUuid(s: string): boolean {
  return UUID_V4_RE.test(s);
}

import { getAdminClient } from '@/lib/db/client';
import { ApiError } from '@/lib/errors';

export type IdempotencyOutcome<T> =
  | { kind: 'fresh'; save: (response: T, statusCode: number) => Promise<void> }
  | { kind: 'replay'; response: unknown; statusCode: number };

export async function checkIdempotency(params: {
  key: string;
  apiKeyId: string;
  body: unknown;
}): Promise<IdempotencyOutcome<unknown>> {
  if (!params.key) throw new ApiError('IDEMPOTENCY_KEY_REQUIRED', 400, 'Idempotency-Key header wajib');
  if (!isValidUuid(params.key)) throw new ApiError('INVALID_IDEMPOTENCY_KEY', 400, 'Idempotency-Key harus UUID v4');

  const requestHash = hashRequest(params.body);
  const sb = getAdminClient();

  const { data: existing } = await sb
    .from('idempotency_records')
    .select('request_hash, response_json, status_code')
    .eq('key', params.key)
    .eq('api_key_id', params.apiKeyId)
    .maybeSingle();

  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new ApiError('IDEMPOTENCY_KEY_REUSED', 409, 'Idempotency-Key sudah dipakai dengan body berbeda');
    }
    return { kind: 'replay', response: existing.response_json, statusCode: existing.status_code };
  }

  return {
    kind: 'fresh',
    save: async (response, statusCode) => {
      await sb.from('idempotency_records').insert({
        key: params.key,
        api_key_id: params.apiKeyId,
        request_hash: requestHash,
        response_json: response as never,
        status_code: statusCode,
      });
    },
  };
}
