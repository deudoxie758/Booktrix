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

test('manager can enter an explicit walk-in booking', async ({ page }) => {
  await signIn(page, 'manager.e2e@booktrix.test', '/business/calendar')
  await page.getByRole('radio', { name: /walk-in customer/i }).check()
  await page.getByLabel(/customer name/i).fill(`E2E Walk-in ${Date.now()}`)
  await page.getByLabel('Location').last().selectOption({ label: 'E2E Castries Studio' })
  await page.getByLabel('Service').last().selectOption({ label: 'E2E Deep Tissue Massage' })
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16)
  await page.getByLabel(/date and time/i).fill(tomorrow)
  await page.getByRole('button', { name: /create booking/i }).click()
  await expect(page.getByRole('heading', { name: /booking calendar/i })).toBeVisible()
})

test('accounts profile cannot open manager booking operations', async ({ page }) => {
  await signIn(page, 'accounts.e2e@booktrix.test', '/business/calendar')
  await expect(page.getByRole('heading', { name: /booking calendar/i })).not.toBeVisible()
})
