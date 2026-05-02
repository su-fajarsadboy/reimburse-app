import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, createTripViaApi } from './helpers';

const PASSWORD = 'Savoir#2026';

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
}

async function seedOneTxn(page: Page, tripId: string): Promise<string> {
  const partsRes = await page.request.get(`/api/admin/trips/${tripId}/api-keys`);
  expect(partsRes.ok()).toBeTruthy();
  // Use the v1 participants endpoint (needs a key) to fetch IDs
  const keyRes = await page.request.post(`/api/admin/trips/${tripId}/api-keys`, {
    data: { label: 'inline-test' },
  });
  const { plain } = (await keyRes.json()).data;
  const partsApi = await page.request.get('/api/v1/participants', {
    headers: { authorization: `Bearer ${plain}` },
  });
  const partsBody = await partsApi.json();
  const [p1] = partsBody.data;
  const txn = await page.request.post(`/api/admin/trips/${tripId}/transactions`, {
    data: {
      description: 'Original Description',
      amount: 50000,
      category: 'lain',
      payer_id: p1.id,
      participant_ids: [p1.id],
    },
  });
  expect(txn.status()).toBe(201);
  const body = await txn.json();
  return body.data.id;
}

test.describe('inline edit / delete on trip page', () => {
  test('approver can update a transaction inline', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'InlineEdit ' + Date.now() });
    await seedOneTxn(page, trip.tripId);

    await page.goto(`/dashboard/trip/${trip.tripId}`);
    await expect(page.getByText('Original Description')).toBeVisible();

    // Hover to reveal edit button, then click it
    await page.getByText('Original Description').hover();
    await page.getByRole('button', { name: /edit Original Description/i }).click();

    // Form should now be visible with the description prefilled
    const descInput = page.getByPlaceholder('Deskripsi', { exact: true });
    await expect(descInput).toBeVisible();
    await descInput.fill('Edited Description');

    const amountInput = page.getByPlaceholder('Nominal');
    await amountInput.fill('75000');

    await page.getByRole('button', { name: /simpan/i }).click();

    // Updated row visible
    await expect(page.getByText('Edited Description')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Rp 75.000').first()).toBeVisible();
    await expect(page.getByText('Original Description')).toHaveCount(0);
  });

  test('manager can also update a transaction inline', async ({ page }) => {
    await loginAs(page, 'refa@yopmail.com');
    const trip = await createTripViaApi(page, { name: 'ManagerEdit ' + Date.now() });
    await seedOneTxn(page, trip.tripId);

    await page.goto(`/dashboard/trip/${trip.tripId}`);
    await page.getByText('Original Description').hover();
    await page.getByRole('button', { name: /edit Original Description/i }).click();
    await page.getByPlaceholder('Deskripsi', { exact: true }).fill('Manager Edited');
    await page.getByRole('button', { name: /simpan/i }).click();
    await expect(page.getByText('Manager Edited')).toBeVisible({ timeout: 8000 });
  });

  test('cancel button reverts edit without saving', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'EditCancel ' + Date.now() });
    await seedOneTxn(page, trip.tripId);

    await page.goto(`/dashboard/trip/${trip.tripId}`);
    await page.getByText('Original Description').hover();
    await page.getByRole('button', { name: /edit Original Description/i }).click();
    await page.getByPlaceholder('Deskripsi', { exact: true }).fill('Should be discarded');
    await page.getByRole('button', { name: /batal/i }).click();
    await expect(page.getByText('Original Description')).toBeVisible();
    await expect(page.getByText('Should be discarded')).toHaveCount(0);
  });

  test('delete removes the transaction', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'Delete ' + Date.now() });
    await seedOneTxn(page, trip.tripId);

    await page.goto(`/dashboard/trip/${trip.tripId}`);
    await expect(page.getByText('Original Description')).toBeVisible();

    page.once('dialog', d => d.accept());
    await page.getByText('Original Description').hover();
    await page.getByRole('button', { name: /hapus Original Description/i }).click();

    await expect(page.getByText('Original Description')).toHaveCount(0, { timeout: 8000 });
    await expect(page.getByText(/tidak ada transaksi/i)).toBeVisible();
  });
});
