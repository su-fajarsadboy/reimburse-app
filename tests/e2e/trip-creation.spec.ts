import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('setup wizard / trip creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Step 1 → Lanjut blocked when nama empty', async ({ page }) => {
    await page.goto('/dashboard/trip/new');
    const lanjut = page.getByRole('button', { name: /lanjut/i });
    await expect(lanjut).toBeDisabled();
    await page.fill('#name', 'X');
    await expect(lanjut).toBeEnabled();
  });

  test('full wizard flow → share screen + Ke Dashboard navigates to trip page', async ({ page }) => {
    await page.goto('/dashboard/trip/new');

    await page.fill('#name', 'WizardFlow ' + Date.now());
    await page.click('button:has-text("Lanjut")');

    await page.fill('input[placeholder="Peserta 1"]', 'Alice');
    await page.fill('input[placeholder="Peserta 2"]', 'Bob');
    await page.click('button:has-text("Buat Trip")');

    await page.waitForFunction(
      () => document.body.innerText.includes('Trip dibuat'),
      { timeout: 15_000 },
    );

    // Share link present (starts with origin/trip/)
    const shareLink = page.locator('text=/^http:\\/\\/.+\\/trip\\/[A-Za-z0-9_-]+$/');
    await expect(shareLink).toBeVisible();

    await page.click('text=Ke Dashboard');
    await page.waitForURL(/\/dashboard\/trip\/trip_/);
    await expect(page.getByText('Semua Pengeluaran').first()).toBeVisible();
  });

  test('add and remove peserta in step 2', async ({ page }) => {
    await page.goto('/dashboard/trip/new');
    await page.fill('#name', 'PesertaTest');
    await page.click('button:has-text("Lanjut")');

    // Default 2 peserta inputs
    await expect(page.locator('input[placeholder^="Peserta"]')).toHaveCount(2);

    await page.click('button:has-text("Tambah peserta")');
    await expect(page.locator('input[placeholder^="Peserta"]')).toHaveCount(3);

    // Remove the third
    const removeBtns = page.locator('input[placeholder^="Peserta"]').locator('..').locator('button');
    await removeBtns.last().click();
    await expect(page.locator('input[placeholder^="Peserta"]')).toHaveCount(2);
  });

  test('Buat Trip disabled if fewer than 2 named peserta', async ({ page }) => {
    await page.goto('/dashboard/trip/new');
    await page.fill('#name', 'BlockedTrip');
    await page.click('button:has-text("Lanjut")');

    // Initial state: both peserta blank → button disabled
    const buatBtn = page.getByRole('button', { name: /buat trip/i });
    await expect(buatBtn).toBeDisabled();

    await page.fill('input[placeholder="Peserta 1"]', 'OnlyOne');
    await expect(buatBtn).toBeDisabled();

    await page.fill('input[placeholder="Peserta 2"]', 'TwoPeople');
    await expect(buatBtn).toBeEnabled();
  });
});
