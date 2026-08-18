import { expect, test } from '@playwright/test'

const signIn = async (page: import('@playwright/test').Page, email: string, callbackUrl: string) => {
  await page.goto(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}

test('customer discovers and builds a multi-service booking', async ({ page }) => {
  await page.goto('/search')
  await page.getByLabel('Search services').fill('massage')
  await page.getByRole('button', { name: /^search$/i }).click()
  const studio = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Booktrix E2E Studio' }) })
  await studio.getByRole('link', { name: /view services/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('checkbox', { name: 'E2E Deep Tissue Massage' }).check()
  await expect(page.getByRole('status')).toHaveText(/1 service selected/i)
  await page.getByRole('checkbox', { name: 'E2E Classic Facial' }).check()
  await expect(page.getByRole('status')).toHaveText(/2 services selected/i)
  await page.getByRole('link', { name: /^book selected services$/i }).click()
  await expect(page.getByRole('heading', { name: /plan your visit to booktrix e2e studio/i })).toBeVisible()
  await expect(page.getByText('E2E Deep Tissue Massage')).toBeVisible()
  await expect(page.getByText('E2E Classic Facial')).toBeVisible()
})

test('customer signs in from a held single-service CASH checkout and opens the booking detail', async ({ page }) => {
  const appointmentDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10)

  await page.goto('/s/booktrix-e2e-studio')
  await page.getByRole('checkbox', { name: 'E2E Deep Tissue Massage' }).check()
  await page.getByRole('link', { name: /^book selected services$/i }).click()
  await page.getByRole('button', { name: /continue to location/i }).click()
  await page.getByRole('radio', { name: 'E2E Castries Studio' }).check()
  await page.getByRole('button', { name: /continue to date/i }).click()
  await page.getByLabel('Date').fill(appointmentDate)
  await page.getByRole('button', { name: /\d{1,2}:\d{2}/ }).first().click()
  await expect(page.getByRole('status')).toHaveText(/time reserved for 10 minutes/i)
  await page.getByRole('button', { name: /continue to details/i }).click()

  const callback = new URL(page.url()).searchParams.get('callbackUrl')
  expect(callback).toMatch(/^\/book\/booktrix-e2e-studio\?hold=/)
  await page.getByLabel('Email Address').fill('customer.e2e@booktrix.test')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page.getByRole('group', { name: /how would you like to pay/i })).toBeVisible()
  await expect(page.getByText('E2E Deep Tissue Massage')).toBeVisible()
  await expect(page.getByText('E2E Classic Facial')).not.toBeVisible()
  await page.getByRole('radio', { name: /pay cash/i }).check()
  await page.getByRole('button', { name: /review booking/i }).click()
  await page.getByRole('button', { name: /confirm booking/i }).click()
  await page.getByRole('link', { name: /view your booking/i }).click()

  await expect(page).toHaveURL(/\/profile\/bookings\//)
  await expect(page.getByRole('heading', { name: /your appointment/i })).toBeVisible()
  await expect(page.getByText('E2E Deep Tissue Massage')).toBeVisible()
})

test('seeded customer can open Booktrix booking history', async ({ page }) => {
  await signIn(page, 'customer.e2e@booktrix.test', '/profile/bookings')
  await expect(page).toHaveURL(/\/profile\/bookings/)
  await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible()
  await expect(page.getByText(/coming up/i)).toBeVisible()
})
