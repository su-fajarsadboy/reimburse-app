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
