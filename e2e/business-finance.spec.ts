import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string, callbackUrl = '/business/finance') {
  await page.goto(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}

test('owner sees the finance ledger with truthful pending-provider copy and no cash-collection claims', async ({ page }) => {
  await signIn(page, 'owner.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Finance', exact: true })).toBeVisible()
  await expect(page.getByText(/no live payment provider is connected yet\. these amounts are provider-neutral/i)).toBeVisible()
  // Scoped to the summary metrics region: the ledger below can legitimately
  // contain rows with their own "Record cash collected" controls and cash
  // evidence history whose text also contains these phrases as substrings.
  const summary = page.getByLabel('Finance summary')
  await expect(summary.getByText('Booked revenue', { exact: true })).toBeVisible()
  await expect(summary.getByText('Cash collected', { exact: true })).toBeVisible()
})

test('accounts can filter the ledger and the export link preserves the applied filters', async ({ page }) => {
  await signIn(page, 'accounts.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Finance', exact: true })).toBeVisible()

  const filterForm = page.getByRole('form', { name: /filter finance ledger/i })
  await filterForm.getByLabel(/booking status/i).selectOption('CANCELLED')
  await filterForm.getByRole('button', { name: /apply filters/i }).click()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/status=CANCELLED/)

  const exportLink = page.getByRole('link', { name: /export csv/i })
  await expect(exportLink).toHaveAttribute('href', /status=CANCELLED/)
})

test('manager cannot reach the finance workspace', async ({ page }) => {
  await signIn(page, 'manager.e2e@booktrix.test')
  const response = await page.goto('/business/finance')
  await expect(page.getByRole('heading', { name: 'Finance', exact: true })).toBeHidden()
  expect(response?.ok()).toBeFalsy()
})

test('staff cannot reach the finance workspace', async ({ page }) => {
  await signIn(page, 'staff.e2e@booktrix.test')
  const response = await page.goto('/business/finance')
  await expect(page.getByRole('heading', { name: 'Finance', exact: true })).toBeHidden()
  expect(response?.ok()).toBeFalsy()
})

test('the CSV export requires authentication and returns a CSV attachment for an authorized actor', async ({ page, context, browser, baseURL }) => {
  const anonymous = await browser.newContext({ baseURL })
  // `/business/*` is protected by next-auth middleware, which redirects an
  // unauthenticated request to `/auth/sign-in` rather than letting the route
  // handler's own 401 ever run. Playwright's APIRequestContext follows
  // redirects by default, so asserting on `.ok()` alone would only ever see
  // the (200) sign-in page — disable redirects and assert the redirect
  // itself, which is the actual denial.
  const anonymousResponse = await anonymous.request.get('/business/finance/export', { maxRedirects: 0 })
  expect(anonymousResponse.status()).toBeGreaterThanOrEqual(300)
  expect(anonymousResponse.status()).toBeLessThan(400)
  expect(anonymousResponse.headers()['location']).toContain('/auth/sign-in')
  await anonymous.close()

  await signIn(page, 'accounts.e2e@booktrix.test')
  const response = await context.request.get('/business/finance/export')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('text/csv')
  expect(response.headers()['content-disposition']).toContain('attachment')
  const body = await response.text()
  expect(body.split('\r\n')[0]).toContain('Order ID')
})

test('finance layout does not overflow at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await signIn(page, 'owner.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Finance', exact: true })).toBeVisible()
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflows).toBe(false)
})
