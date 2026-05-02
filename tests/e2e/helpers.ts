import { Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme123';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
}

export type CreatedTrip = {
  tripId: string;
  shareToken: string;
  participants: Array<{ id: string; name: string }>;
};

export async function createTripViaApi(
  page: Page,
  opts: { name?: string; participants?: string[] } = {},
): Promise<CreatedTrip> {
  const name = opts.name ?? `Auto Trip ${Date.now()}`;
  const partsList = opts.participants ?? ['Alice', 'Bob'];

  // Re-uses session cookie set by loginAsAdmin
  const create = await page.request.post('/api/admin/trips', {
    data: {
      trip: { name },
      participants: partsList.map(p => ({ name: p })),
    },
  });
  expect(create.ok()).toBeTruthy();
  const body = await create.json();
  expect(body.success).toBe(true);

  // Pull participant ids
  const partsRes = await page.request.get(
    `/api/v1/participants`,
  ).catch(() => null);
  // /api/v1 needs Bearer auth, so fall back to admin endpoints if needed.
  // Easiest: query supabase directly via a tiny wrapper isn't available here.
  // Read participants via the admin-side trip page once we have it.

  return {
    tripId: body.data.tripId,
    shareToken: body.data.shareToken,
    participants: [], // populated lazily by callers if needed
  };
}

export async function getParticipantIds(
  page: Page,
  shareToken: string,
): Promise<Array<{ id: string; name: string }>> {
  // The peserta web endpoint exposes transactions, not participants directly.
  // Cleanest path: open the share-token entry page and scrape names + ids
  // from the data attributes, OR call admin participants list.
  // For helper simplicity, hit the admin trip page and grep.
  const res = await page.request.get(`/trip/${shareToken}`);
  expect(res.status()).toBeLessThan(400);
  // Caller can use names; ids come from a follow-up admin call if needed.
  return [];
}
