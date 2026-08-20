import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string, callbackUrl = '/business/settings') {
  await page.goto(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}

test('owner saves a business profile and booking policy, and readiness/publication state is truthful', async ({ page }) => {
  await signIn(page, 'owner.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Business settings' })).toBeVisible()

  const suffix = `${test.info().project.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const description = `Refreshed storefront description ${suffix}`

  const profileForm = page.getByRole('form', { name: 'Business profile' })
  await profileForm.getByLabel(/description/i).fill(description)
  await profileForm.getByRole('button', { name: /save profile/i }).click()
  await expect(profileForm.getByRole('status')).toHaveText('Business profile saved.')

  const policyForm = page.getByRole('form', { name: 'Booking policy' })
  await expect(policyForm.getByLabel(/currency/i)).toHaveValue('XCD')
  await expect(policyForm.getByLabel(/currency/i)).toHaveAttribute('readonly', '')
  await expect(policyForm.getByLabel(/timezone/i)).toHaveValue('America/St_Lucia')
  await policyForm.getByLabel(/cancellation and rescheduling policy/i).fill(`Cancel 24 hours ahead. ${suffix}`)
  await policyForm.getByRole('button', { name: /save booking policy/i }).click()
  await expect(policyForm.getByRole('status')).toHaveText('Booking policy saved.')

  await page.reload()
  await expect(page.getByRole('form', { name: 'Business profile' }).getByLabel(/description/i)).toHaveValue(description)

  const publicationSection = page.locator('#publication')
  await expect(publicationSection.getByText(/not available in this environment/i)).toBeVisible()
  await expect(publicationSection.getByText(/no subscription charges or commissions are applied/i)).toBeVisible()
  await expect(publicationSection.getByRole('button', { name: /connect|enable/i })).toHaveCount(0)
})

test('manager cannot reach business settings', async ({ page }) => {
  await signIn(page, 'manager.e2e@booktrix.test')
  const response = await page.goto('/business/settings')
  await expect(page.getByRole('heading', { name: 'Business settings', exact: true })).toBeHidden()
  expect(response?.ok()).toBeFalsy()
})

test('accounts cannot reach business settings', async ({ page }) => {
  await signIn(page, 'accounts.e2e@booktrix.test')
  const response = await page.goto('/business/settings')
  await expect(page.getByRole('heading', { name: 'Business settings', exact: true })).toBeHidden()
  expect(response?.ok()).toBeFalsy()
})

test('business settings layout does not overflow at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await signIn(page, 'owner.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Business settings' })).toBeVisible()
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflows).toBe(false)
})
