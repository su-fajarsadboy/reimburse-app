import { test, expect } from '@playwright/test';
import { loginAsAdmin, createTripViaApi } from './helpers';

test.describe('API keys page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('empty state shown when no keys exist', async ({ page }) => {
    const trip = await createTripViaApi(page);
    await page.goto(`/dashboard/trip/${trip.tripId}/api-keys`);
    await expect(page.getByText(/belum ada api key|no api key/i)).toBeVisible();
  });

  test('generate key flow displays a ctx_live_ token once', async ({ page }) => {
    const trip = await createTripViaApi(page);
    await page.goto(`/dashboard/trip/${trip.tripId}/api-keys`);

    // Click "Generate Key" or similar primary button
    const generateBtn = page.getByRole('button', { name: /generate key|generate/i }).first();
    await generateBtn.click();

    // A modal opens with form for label + a confirm Generate button.
    // shadcn dialog uses role=dialog. Wait for it.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Optional label field
    const label = dialog.getByLabel(/label|nama/i).first();
    if (await label.isVisible().catch(() => false)) {
      await label.fill('e2e-test-key');
    }

    // Confirm generate inside the dialog
    await dialog.getByRole('button', { name: /^generate$/i }).click();

    // Token shown — match prefix anywhere on page
    await page.waitForFunction(
      () => /ctx_live_[A-Za-z0-9]{8,}/.test(document.body.innerText),
      { timeout: 8000 },
    );
  });
});

test.describe('agent API via Bearer token', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('GET /api/v1/categories returns 401 without bearer', async ({ request }) => {
    const r = await request.get('/api/v1/categories');
    expect(r.status()).toBe(401);
  });

  test('end-to-end: generate key → call /api/v1/categories with bearer', async ({ page, request }) => {
    const trip = await createTripViaApi(page);

    // Use admin endpoint to mint a key (avoids modal flakiness)
    const keyRes = await page.request.post(
      `/api/admin/trips/${trip.tripId}/api-keys`,
      { data: { label: 'e2e-bearer' } },
    );
    expect(keyRes.ok()).toBeTruthy();
    const keyBody = await keyRes.json();
    const plain: string = keyBody.data.plain;
    expect(plain).toMatch(/^ctx_live_/);

    // Now hit /api/v1/categories
    const cats = await request.get('/api/v1/categories', {
      headers: { authorization: `Bearer ${plain}` },
    });
    expect(cats.status()).toBe(200);
    const body = await cats.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
