import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string, callbackUrl: string) {
  await page.goto(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}

test('assigned manager sees the agenda and operational filters', async ({ page }) => {
  await signIn(page, 'manager.e2e@booktrix.test', '/business/calendar')
  await expect(page.getByRole('heading', { name: /booking calendar/i })).toBeVisible()
  await expect(page.getByLabel('Location').first()).toBeVisible()
  await expect(page.getByLabel('Staff')).toBeVisible()
  await expect(page.getByLabel('Service').first()).toBeVisible()
  await expect(page.getByLabel('Status')).toBeVisible()
})

test('manager dashboard keeps workspace navigation separate from the marketplace', async ({ page }) => {
  await signIn(page, 'manager.e2e@booktrix.test', '/business')
  await expect(page.getByRole('heading', { name: /operations overview/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /booktrx/i })).toHaveAttribute('href', '/business')
  await expect(page.getByRole('link', { name: /view marketplace/i })).toHaveAttribute('href', '/')
  await expect(page.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/profile')
})

test('owner can enter an explicit walk-in booking without the form freezing', async ({ page }) => {
  await signIn(page, 'owner.e2e@booktrix.test', '/business/calendar')
  await page.getByRole('radio', { name: /walk-in customer/i }).check()
  await page.getByLabel(/customer name/i).fill(`E2E Walk-in ${Date.now()}`)
  await page.getByLabel('Location').last().selectOption({ label: 'E2E Castries Studio' })
  await page.locator('select[name="offeringId"]').selectOption({ label: 'E2E Deep Tissue Massage' })
  await page.locator('select[name="membershipId"]').selectOption({ label: 'Amara E2E' })
  const from = new Date(Date.now() + 86_400_000)
  const to = new Date(Date.now() + 8 * 86_400_000)
  const availability = await page.request.get(`/api/availability?${new URLSearchParams({
    businessId: 'booktrix-e2e-business',
    locationId: 'booktrix-e2e-location-castries',
    offeringIds: 'booktrix-e2e-offering-massage',
    attendeeCounts: '1',
    from: from.toISOString(),
    to: to.toISOString(),
  })}`)
  const payload = await availability.json() as { slots: Array<{ start: string }> }
  expect(payload.slots.length).toBeGreaterThan(0)
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/St_Lucia', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(payload.slots[0]!.start)).map(({ type, value }) => [type, value]))
  await page.getByLabel(/date and time/i).fill(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`)
  await page.getByRole('button', { name: /create booking/i }).click()
  await expect(page.getByRole('status')).toContainText(/booking created successfully/i)
  await expect(page.getByRole('button', { name: /create booking/i })).toBeEnabled()
})

test('accounts profile cannot open manager booking operations', async ({ page }) => {
  await signIn(page, 'accounts.e2e@booktrix.test', '/business/calendar')
  await expect(page.getByRole('heading', { name: /booking calendar/i })).not.toBeVisible()
})
