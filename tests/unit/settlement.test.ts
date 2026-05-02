import { describe, it, expect } from 'vitest';
import { computeSettlement, computeBalances } from '@/lib/services/settlement';

const P = (id: string) => ({ id, name: id });
const TX = (amount: number, payer: string, parts: string[]) => ({
  amount, payer_id: payer, participant_ids: parts,
});

describe('computeBalances', () => {
  it('returns zero balances for no transactions', () => {
    const b = computeBalances([P('a'), P('b')], []);
    expect(b).toEqual({ a: 0, b: 0 });
  });

  it('credits payer the full amount, debits each participant their share', () => {
    const b = computeBalances([P('a'), P('b')], [TX(100, 'a', ['a', 'b'])]);
    expect(b.a).toBe(50);
    expect(b.b).toBe(-50);
  });

  it('handles non-divisible amounts deterministically (remainder to first sorted participant)', () => {
    const b = computeBalances([P('a'), P('b'), P('c')], [TX(100, 'a', ['a', 'b', 'c'])]);
    // share = 33, remainder = 1 → participant a (sorted first) gets 34 share
    expect(b.a).toBe(100 - 34);
    expect(b.b).toBe(-33);
    expect(b.c).toBe(-33);
  });

  it('aggregates across multiple transactions', () => {
    const b = computeBalances(
      [P('a'), P('b')],
      [TX(100, 'a', ['a', 'b']), TX(40, 'b', ['a', 'b'])]
    );
    expect(b.a).toBe(50 - 20);
    expect(b.b).toBe(-50 + 20);
  });

  it('participant not in any transaction has 0 balance', () => {
    const b = computeBalances([P('a'), P('b'), P('c')], [TX(100, 'a', ['a', 'b'])]);
    expect(b.c).toBe(0);
  });
});

describe('computeSettlement', () => {
  it('returns empty array when no transactions', () => {
    expect(computeSettlement([P('a'), P('b')], [])).toEqual([]);
  });

  it('returns empty array when all balances are zero', () => {
    const r = computeSettlement(
      [P('a'), P('b')],
      [TX(100, 'a', ['a', 'b']), TX(100, 'b', ['a', 'b'])]
    );
    expect(r).toEqual([]);
  });

  it('matches single creditor to single debtor', () => {
    const r = computeSettlement([P('a'), P('b')], [TX(100, 'a', ['a', 'b'])]);
    expect(r).toEqual([{ from_participant_id: 'b', to_participant_id: 'a', amount: 50 }]);
  });

  it('produces at most N-1 transfers for N participants', () => {
    const parts = [P('a'), P('b'), P('c'), P('d'), P('e')];
    const r = computeSettlement(parts, [
      TX(500, 'a', ['a', 'b', 'c', 'd', 'e']),
    ]);
    expect(r.length).toBeLessThanOrEqual(4);
    // Sum from b/c/d/e back to a should equal 400 (each owes 100)
    const totalToA = r.filter(t => t.to_participant_id === 'a').reduce((s, t) => s + t.amount, 0);
    expect(totalToA).toBe(400);
  });

  it('handles multi-creditor multi-debtor optimally', () => {
    const r = computeSettlement(
      [P('a'), P('b'), P('c')],
      [TX(300, 'a', ['a', 'b', 'c']), TX(150, 'b', ['a', 'b', 'c'])]
    );
    // a paid 300, share 100 → +200
    // b paid 150, share 100 → +50
    // c paid 0, share 100+50=150 → -150
    // Wait: share per tx is 300/3=100 then 150/3=50. c owes 100+50=150.
    // a balance = 300-100-50 = 150
    // b balance = 150-100-50 = 0
    // c balance = -150
    // Expect 1 transfer: c→a 150
    expect(r.length).toBe(1);
    expect(r[0]).toEqual({ from_participant_id: 'c', to_participant_id: 'a', amount: 150 });
  });
});
