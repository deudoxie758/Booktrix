import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/sign-in?callbackUrl=/business/locations')
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}

test('manager adds and deactivates an authorized location', async ({ page }) => {
  await signIn(page, 'manager.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Locations' })).toBeVisible()

  const suffix = `${test.info().project.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const name = `E2E Manager Location ${suffix}`
  const form = page.getByRole('form', { name: 'Add location' })
  await form.getByLabel('Location name').fill(name)
  await form.getByLabel('Slug').fill(`manager-location-${suffix}`)
  await form.getByLabel('Address').fill('44 Test Street, Castries')
  await form.getByLabel('Phone').fill('+1 758 555 0144')
  await form.getByLabel('Email').fill(`manager-${suffix}@booktrix.test`)
  await form.getByRole('button', { name: 'Add location' }).click()
  await expect(form.getByRole('status')).toHaveText('Location added successfully.')

  await page.reload()
  const heading = page.getByRole('heading', { name })
  await expect(heading).toBeVisible()
  const card = heading.locator('xpath=ancestor::article')
  page.once('dialog', (dialog) => dialog.accept())
  await card.getByRole('button', { name: 'Deactivate location' }).click()
  await expect(card.getByRole('status')).toHaveText('Location deactivated.')
})

test('accounts sees assigned locations without mutation controls', async ({ page }) => {
  await signIn(page, 'accounts.e2e@booktrix.test')
  await expect(page.getByText(/read-only access/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /add location|deactivate location|save opening hours/i })).toHaveCount(0)
})

test('locations layout does not overflow at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await signIn(page, 'manager.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Locations' })).toBeVisible()
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflows).toBe(false)
})
