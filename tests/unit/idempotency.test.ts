import { describe, it, expect } from 'vitest';
import { canonicalize, hashRequest, isValidUuid } from '@/lib/services/idempotency';

describe('canonicalize', () => {
  it('produces same string regardless of key order', () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });
  it('handles nested objects', () => {
    expect(canonicalize({ x: { b: 2, a: 1 } })).toBe(canonicalize({ x: { a: 1, b: 2 } }));
  });
  it('preserves array order', () => {
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });
});

describe('hashRequest', () => {
  it('produces same hex for equivalent payloads', () => {
    const a = hashRequest({ a: 1, b: [2, 3] });
    const b = hashRequest({ b: [2, 3], a: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it('produces different hex for different payloads', () => {
    expect(hashRequest({ a: 1 })).not.toBe(hashRequest({ a: 2 }));
  });
});

describe('isValidUuid', () => {
  it('accepts UUID v4', () => {
    expect(isValidUuid('7b3e9a4c-2f1d-4e8a-9c3b-1a2f3e4d5b6c')).toBe(true);
  });
  it('rejects malformed strings', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('7b3e9a4c-2f1d-1e8a-9c3b-1a2f3e4d5b6c')).toBe(false); // version 1
  });
});
