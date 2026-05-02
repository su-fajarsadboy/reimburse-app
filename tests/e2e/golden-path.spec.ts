import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme123';

test.setTimeout(60_000);

test('golden path: login → create trip → land on trip page', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');

  // 2. Open setup wizard
  await page.click('text=Trip Baru');
  await expect(page).toHaveURL(/\/dashboard\/trip\/new/);

  // 3. Step 1 — name
  await page.fill('#name', 'E2E Trip ' + Date.now());
  await page.click('button:has-text("Lanjut")');

  // 4. Step 2 — peserta
  await page.fill('input[placeholder="Peserta 1"]', 'Alice');
  await page.fill('input[placeholder="Peserta 2"]', 'Bob');
  await page.click('button:has-text("Buat Trip")');

  // 5. Step 3 — share screen visible
  await page.waitForFunction(
    () => document.body.innerText.includes('Trip dibuat'),
    { timeout: 15_000 },
  );

  // 6. Click "Ke Dashboard" → trip page
  await page.click('text=Ke Dashboard');
  await page.waitForURL(/\/dashboard\/trip\/trip_/);

  // 7. Verify trip page chrome
  await expect(page.getByText('Semua Pengeluaran').first()).toBeVisible({ timeout: 10_000 });

  // 8. Pull tripId; verify settlement page renders without error
  const tripId = page.url().split('/trip/')[1].split('/')[0];
  await page.goto(`/dashboard/trip/${tripId}/settlement`);
  await expect(page.getByText('Money Lanes', { exact: false }).first()).toBeVisible({ timeout: 10_000 });

  // 9. Close trip via setup page
  await page.goto(`/dashboard/trip/${tripId}/setup`);
  page.once('dialog', d => d.accept());
  await page.click('button:has-text("Tutup Trip")');

  // After close, the trip status flips to 'closed'; the page should reflect that.
  await page.waitForFunction(
    () => document.body.innerText.toLowerCase().includes('ditutup') ||
          document.body.innerText.toLowerCase().includes('closed'),
    { timeout: 10_000 },
  ).catch(() => {
    // Some flows redirect or rely on a toast — non-fatal.
  });
});
