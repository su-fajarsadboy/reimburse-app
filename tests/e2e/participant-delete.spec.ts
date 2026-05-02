import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, createTripViaApi } from './helpers';

async function getParticipantIds(page: Page, tripId: string) {
  // Mint a key + use the v1 participants endpoint
  const keyRes = await page.request.post(`/api/admin/trips/${tripId}/api-keys`, {
    data: { label: 'pdel-test' },
  });
  const { plain } = (await keyRes.json()).data;
  const partsApi = await page.request.get('/api/v1/participants', {
    headers: { authorization: `Bearer ${plain}` },
  });
  return (await partsApi.json()).data as Array<{ id: string; name: string }>;
}

test.describe('participant delete safety gates', () => {
  test('blocks delete when participant is the payer (422)', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'PayerBlock ' + Date.now() });
    const parts = await getParticipantIds(page, trip.tripId);
    const [payer, other] = parts;
    await page.request.post(`/api/admin/trips/${trip.tripId}/transactions`, {
      data: {
        description: 'pay test',
        amount: 1000,
        category: 'lain',
        payer_id: payer.id,
        participant_ids: [payer.id, other.id],
      },
    });

    const r = await page.request.delete(`/api/admin/trips/${trip.tripId}/participants/${payer.id}`);
    expect(r.status()).toBe(422);
    const body = await r.json();
    expect(body.error?.message).toMatch(/payer/i);
  });

  test('returns 409 with affected_splits when participant has splits but no force flag', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'SplitBlock ' + Date.now() });
    const parts = await getParticipantIds(page, trip.tripId);
    const [payer, victim] = parts;

    await page.request.post(`/api/admin/trips/${trip.tripId}/transactions`, {
      data: {
        description: 'split test',
        amount: 1000,
        category: 'lain',
        payer_id: payer.id,
        participant_ids: [payer.id, victim.id],
      },
    });

    const r = await page.request.delete(`/api/admin/trips/${trip.tripId}/participants/${victim.id}`);
    expect(r.status()).toBe(409);
    const body = await r.json();
    expect(body.error?.fields?.affected_splits).toBe('1');
    expect(body.error?.message).toMatch(/force=true/);
  });

  test('force=true removes the participant and cleans transaction_participants', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'ForceDelete ' + Date.now() });
    const parts = await getParticipantIds(page, trip.tripId);
    const [payer, victim] = parts;

    await page.request.post(`/api/admin/trips/${trip.tripId}/transactions`, {
      data: {
        description: 'force test',
        amount: 1000,
        category: 'lain',
        payer_id: payer.id,
        participant_ids: [payer.id, victim.id],
      },
    });

    const r = await page.request.delete(
      `/api/admin/trips/${trip.tripId}/participants/${victim.id}?force=true`,
    );
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.data.affected_splits).toBe(1);

    // Confirm the participant is gone
    const remaining = await getParticipantIds(page, trip.tripId);
    expect(remaining.find((p) => p.id === victim.id)).toBeUndefined();
  });

  test('participant with no splits deletes cleanly (no force needed)', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'CleanDelete ' + Date.now() });
    const parts = await getParticipantIds(page, trip.tripId);
    const lonely = parts[1];
    const r = await page.request.delete(`/api/admin/trips/${trip.tripId}/participants/${lonely.id}`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.data.affected_splits).toBe(0);
  });

  test('UI: Setup page two-step confirm flow removes peserta with splits', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, {
      name: 'UIDelete ' + Date.now(),
      participants: ['Alice', 'Bob', 'Charlie'],
    });
    const parts = await getParticipantIds(page, trip.tripId);
    const alice = parts.find((p) => p.name === 'Alice')!;
    const charlie = parts.find((p) => p.name === 'Charlie')!;

    // Charlie is in a split, paid by Alice
    await page.request.post(`/api/admin/trips/${trip.tripId}/transactions`, {
      data: {
        description: 'shared meal',
        amount: 30000,
        category: 'makan',
        payer_id: alice.id,
        participant_ids: [alice.id, charlie.id],
      },
    });

    await page.goto(`/dashboard/trip/${trip.tripId}/setup`);
    await expect(page.getByText('Charlie')).toBeVisible();

    // Two confirm() calls in a row: first the simple "Hapus peserta",
    // then the warning about affected splits. Accept both.
    page.on('dialog', (d) => d.accept());

    // Span with exactly "Charlie" → parent row → its button
    const charlieRow = page.locator('span', { hasText: /^Charlie$/ }).locator('..');
    await charlieRow.getByRole('button').click();

    await expect(page.getByText('Charlie')).toHaveCount(0, { timeout: 10_000 });
  });
});
