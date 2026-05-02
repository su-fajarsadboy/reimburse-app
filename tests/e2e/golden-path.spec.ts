import { test, expect, request as pwRequest } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme123';

test('golden path: login → create trip → settle → close', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');

  // 2. Create trip
  await page.click('text=Trip Baru');
  await page.fill('#name', 'E2E Trip ' + Date.now());
  await page.click('text=Lanjut');
  await page.fill('input[placeholder="Peserta 1"]', 'Alice');
  await page.fill('input[placeholder="Peserta 2"]', 'Bob');
  await page.click('text=Buat Trip');
  await expect(page.locator('text=Trip dibuat')).toBeVisible({ timeout: 10_000 });
  await page.click('text=Ke Dashboard');

  // 3. Verify on trip page
  await expect(page.locator('text=Semua Pengeluaran')).toBeVisible();

  // 4. Add a transaction via UI
  await page.click('text=Catat Transaksi');
  await page.fill('input[placeholder="Cth. Bensin + tol"]', 'Bensin');
  await page.fill('input[inputmode=numeric]', '100000');
  await page.click('text=Lanjut');
  await page.click('text=Simpan');
  await expect(page.locator('text=Bensin')).toBeVisible({ timeout: 5_000 });

  // 5. Generate API key
  const tripUrl = page.url();
  const tripId = tripUrl.split('/trip/')[1].split('/')[0];
  await page.goto(`/dashboard/trip/${tripId}/api-keys`);
  await page.click('text=Generate Key');
  await page.click('text=Generate');
  const keyText = await page.locator('.mono').first().textContent();
  expect(keyText).toMatch(/^ctx_live_/);

  // 6. Settlement page
  await page.goto(`/dashboard/trip/${tripId}/settlement`);
  await expect(page.locator('text=Money Lanes')).toBeVisible();

  // 7. Close trip
  await page.goto(`/dashboard/trip/${tripId}/setup`);
  page.once('dialog', d => d.accept());
  await page.click('text=Tutup Trip');
  await expect(page.locator('text=Tutup Trip')).not.toBeVisible({ timeout: 5_000 });

  // Reference unused import to keep eslint happy
  void pwRequest;
  void randomUUID;
});
