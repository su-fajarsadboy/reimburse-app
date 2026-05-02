import { test, expect, Page } from '@playwright/test';
import { createTripViaApi } from './helpers';

const PASSWORD = 'Savoir#2026';

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
}

test.describe('RBAC / role gating', () => {
  test('manager sees no Approval link in sidebar', async ({ page }) => {
    await loginAs(page, 'refa@yopmail.com');
    const trip = await createTripViaApi(page, { name: 'ManagerNav ' + Date.now() });
    await page.goto(`/dashboard/trip/${trip.tripId}`);
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('aside').getByText(/^Approval$/)).toHaveCount(0);
    await expect(page.locator('aside').getByText('Manager')).toBeVisible();
  });

  test('approver sees Approval link + role badge', async ({ page }) => {
    await loginAs(page, 'rina@yopmail.com');
    const trip = await createTripViaApi(page, { name: 'ApproverNav ' + Date.now() });
    await page.goto(`/dashboard/trip/${trip.tripId}`);
    await expect(page.locator('aside').getByText(/^Approval$/)).toBeVisible();
    await expect(page.locator('aside').getByText('Approver')).toBeVisible();
  });

  test('manager hitting /approval gets access-denied panel', async ({ page }) => {
    await loginAs(page, 'reza@yopmail.com');
    const trip = await createTripViaApi(page, { name: 'ManagerDenied ' + Date.now() });
    await page.goto(`/dashboard/trip/${trip.tripId}/approval`);
    await expect(page.getByText(/akses ditolak/i)).toBeVisible();
  });

  test('manager cannot call approve endpoint (403)', async ({ page }) => {
    await loginAs(page, 'yahya@yopmail.com');
    const trip = await createTripViaApi(page, { name: 'ManagerApiBlock ' + Date.now() });
    // Insert a reimbursable txn directly with admin (manager has create access)
    const partsRes = await page.request.get(`/api/admin/trips/${trip.tripId}/api-keys`);
    expect(partsRes.ok()).toBeTruthy();
    // Attempt approve via API as manager
    const r = await page.request.post(
      `/api/admin/trips/${trip.tripId}/transactions/txn_doesnotexist/approve`,
      { data: { approved_amount: 100 } },
    );
    expect(r.status()).toBe(403);
    const body = await r.json();
    expect(body.error?.code).toBe('INVALID_AUTH');
    expect(body.error?.message).toMatch(/approver/i);
  });

  test('manager cannot close a trip (403)', async ({ page }) => {
    await loginAs(page, 'refa@yopmail.com');
    const trip = await createTripViaApi(page, { name: 'NoCloseForManager ' + Date.now() });
    const r = await page.request.post(`/api/admin/trips/${trip.tripId}/close`);
    expect(r.status()).toBe(403);
    // Trip Setup page should also hide the danger card for managers
    await page.goto(`/dashboard/trip/${trip.tripId}/setup`);
    await expect(page.getByText(/hanya bisa dilakukan oleh role/i)).toBeVisible();
  });

  test('approver can close a trip (200)', async ({ page }) => {
    await loginAs(page, 'win@yopmail.com');
    const trip = await createTripViaApi(page, { name: 'ApproverCanClose ' + Date.now() });
    const r = await page.request.post(`/api/admin/trips/${trip.tripId}/close`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.data.closed).toBe(true);
  });
});

test.describe('submitter tracking', () => {
  test('admin-submitted txn carries created_by_user info', async ({ page }) => {
    await loginAs(page, 'reza@yopmail.com');
    const trip = await createTripViaApi(page, { name: 'TrackSubmitter ' + Date.now() });

    // Look up participant ids via admin query
    const partsList = await page.request.get(`/api/admin/trips/${trip.tripId}/api-keys`);
    expect(partsList.ok()).toBeTruthy();
    // Use direct DB-shaped insertion via the admin txn endpoint
    const partsViaList = await page.request.get(`/dashboard/trip/${trip.tripId}`);
    expect(partsViaList.ok()).toBeTruthy();

    // Easiest: hit /api/v1 to pull participants — needs an api key first
    const keyRes = await page.request.post(
      `/api/admin/trips/${trip.tripId}/api-keys`,
      { data: { label: 'role-test' } },
    );
    const { plain } = (await keyRes.json()).data;
    const partsApi = await page.request.get('/api/v1/participants', {
      headers: { authorization: `Bearer ${plain}` },
    });
    const partsBody = await partsApi.json();
    const [p1] = partsBody.data;

    const txnRes = await page.request.post(
      `/api/admin/trips/${trip.tripId}/transactions`,
      {
        data: {
          description: 'Tracked tx',
          amount: 10000,
          category: 'lain',
          payer_id: p1.id,
          participant_ids: [p1.id],
        },
      },
    );
    expect(txnRes.status()).toBe(201);
    const txnBody = await txnRes.json();
    expect(txnBody.success).toBe(true);

    // Visit trip page → should show the submitter chip
    await page.goto(`/dashboard/trip/${trip.tripId}`);
    await expect(page.getByText(/Diinput admin reza/i)).toBeVisible({ timeout: 10_000 });
  });
});
