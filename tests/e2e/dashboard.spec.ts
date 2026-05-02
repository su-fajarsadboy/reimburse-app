import { test, expect } from '@playwright/test';
import { loginAsAdmin, createTripViaApi } from './helpers';

test.describe('admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows Trip Baru CTA + heading', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /trip saya/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /trip baru/i })).toBeVisible();
  });

  test('listing includes a freshly created trip', async ({ page }) => {
    const name = 'ListedTrip ' + Date.now();
    await createTripViaApi(page, { name });

    await page.goto('/dashboard');
    await expect(page.getByText(name)).toBeVisible({ timeout: 8000 });
  });
});

test.describe('trip detail page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders header, stats grid, empty transaction list', async ({ page }) => {
    const trip = await createTripViaApi(page);
    await page.goto(`/dashboard/trip/${trip.tripId}`);

    await expect(page.getByText('Semua Pengeluaran').first()).toBeVisible();
    await expect(page.getByText('Total Trip')).toBeVisible();
    await expect(page.getByText('Reimbursable').first()).toBeVisible();
    await expect(page.getByText('Per Orang (Rata)')).toBeVisible();
    await expect(page.getByText(/tidak ada transaksi/i)).toBeVisible();
  });

  test('NewTxnButton renders in topbar', async ({ page }) => {
    const trip = await createTripViaApi(page);
    await page.goto(`/dashboard/trip/${trip.tripId}`);
    await expect(page.getByRole('button', { name: /catat transaksi/i })).toBeVisible();
  });

  test('sidebar links navigate to subpages', async ({ page }) => {
    const trip = await createTripViaApi(page);
    await page.goto(`/dashboard/trip/${trip.tripId}`);

    // Settlement
    await page.click('a:has-text("Settlement")');
    await page.waitForURL(/\/settlement$/);
    await expect(page.getByText(/money lanes/i).first()).toBeVisible();

    // Approval
    await page.click('a:has-text("Approval")');
    await page.waitForURL(/\/approval$/);
  });
});
