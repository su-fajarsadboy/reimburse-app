export type Participant = { id: string; name: string };
export type TxLite = {
  amount: number;
  payer_id: string;
  participant_ids: string[];
};
export type Transfer = {
  from_participant_id: string;
  to_participant_id: string;
  amount: number;
};

export function computeBalances(
  participants: Participant[],
  transactions: TxLite[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  participants.forEach(p => { balances[p.id] = 0; });

  for (const tx of transactions) {
    const n = tx.participant_ids.length;
    if (n === 0) continue;
    const baseShare = Math.floor(tx.amount / n);
    const remainder = tx.amount - baseShare * n;
    // Deterministic: sorted ids; first gets the remainder added.
    const sorted = [...tx.participant_ids].sort();
    sorted.forEach((pid, idx) => {
      const share = idx === 0 ? baseShare + remainder : baseShare;
      balances[pid] = (balances[pid] ?? 0) - share;
    });
    balances[tx.payer_id] = (balances[tx.payer_id] ?? 0) + tx.amount;
  }
  return balances;
}

export function computeSettlement(
  participants: Participant[],
  transactions: TxLite[]
): Transfer[] {
  const balances = computeBalances(participants, transactions);

  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0)
    .map(([id, b]) => ({ id, balance: b }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < 0)
    .map(([id, b]) => ({ id, balance: -b }))
    .sort((a, b) => b.balance - a.balance);

  const transfers: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    if (amount > 0) {
      transfers.push({
        from_participant_id: debtors[i].id,
        to_participant_id: creditors[j].id,
        amount,
      });
    }
    debtors[i].balance -= amount;
    creditors[j].balance -= amount;
    if (debtors[i].balance === 0) i++;
    if (creditors[j].balance === 0) j++;
  }
  return transfers;
}
