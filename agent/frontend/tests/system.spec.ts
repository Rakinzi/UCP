import { test, expect } from '@playwright/test';

const frontendUrls = [
  { name: 'agent-frontend', url: 'http://localhost:5173' },
  { name: 'store1-frontend', url: 'http://localhost:4001' },
  { name: 'store2-frontend', url: 'http://localhost:4002' },
  { name: 'store3-frontend', url: 'http://localhost:4003' },
];

const storeDiscoveryUrls = [
  { name: 'store1', url: 'http://localhost:4001/.well-known/ucp' },
  { name: 'store2', url: 'http://localhost:4002/.well-known/ucp' },
  { name: 'store3', url: 'http://localhost:4003/.well-known/ucp' },
];

test.describe('System smoke tests', () => {
  for (const { name, url } of frontendUrls) {
    test(`${name} loads without 500`, async ({ page }) => {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      expect(response, `${name} response missing`).toBeTruthy();
      expect(response!.status(), `${name} returned ${response!.status()}`).toBeLessThan(500);
      await expect(page.getByText('Internal Error')).toHaveCount(0);
    });
  }

  test('agent frontend shows UCP Agent UI', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('UCP Agent')).toBeVisible();
  });

  for (const { name, url } of storeDiscoveryUrls) {
    test(`${name} exposes discovery endpoint`, async ({ request }) => {
      const response = await request.get(url);
      expect(response.status(), `${name} status ${response.status()}`).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject({
        endpoints: {
          sessions: '/sessions',
          complete: '/complete',
        },
      });
    });
  }

  test('agent backend exposes public key', async ({ request }) => {
    const response = await request.get('http://localhost:8000/public-key');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.public_key).toMatch(/^[0-9a-f]{64}$/);
  });

  test('agent backend can search and generate invoice', async ({ request }) => {
    const search = await request.get('http://localhost:8000/search?q=store');
    expect(search.status()).toBe(200);
    const results = await search.json();
    expect(results.length).toBeGreaterThan(0);

    const first = results[0];
    const invoice = await request.post('http://localhost:8000/invoice', {
      data: {
        items: [
          { store: first.store, product_id: first.id, quantity: 1 },
        ],
      },
    });
    expect(invoice.status()).toBe(200);
    const invoiceData = await invoice.json();
    expect(invoiceData.total).toBeGreaterThan(0);
  });
});
