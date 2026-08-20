import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string, callbackUrl = '/business/team') {
  await page.goto(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}

test('owner creates a one-time invitation and an existing account accepts it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Acceptance mutates the shared seeded account once.')
  await signIn(page, 'owner.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible()

  const form = page.getByRole('form', { name: 'Invite team member' })
  await form.getByLabel('Name').fill('E2E Customer Invitee')
  await form.getByLabel('Email').fill('customer.e2e@booktrix.test')
  await form.getByLabel('Role').selectOption('STAFF')
  await form.getByLabel('E2E Castries Studio', { exact: true }).check()
  await form.getByRole('button', { name: 'Send invitation' }).click()

  const status = form.getByRole('status')
  await expect(status).toContainText('Invitation created')
  const invitationUrl = (await status.textContent())?.match(/\/invitations\/[a-f0-9]{64}/)?.[0]
  expect(invitationUrl).toBeTruthy()

  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL('/')
  await page.goto(invitationUrl!)
  await page.getByRole('link', { name: /sign in to accept/i }).click()
  await page.getByLabel('Email Address').fill('customer.e2e@booktrix.test')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForURL(new RegExp(`${invitationUrl!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
  await page.getByRole('button', { name: /accept invitation/i }).click()
  await page.waitForURL(/\/business\?invitation=accepted/)
  await expect(page.getByText(/assigned locations/i)).toBeVisible()
})

test('Manager invitation roles remain Staff-only', async ({ page }) => {
  await signIn(page, 'manager.e2e@booktrix.test')
  const role = page.locator('#invitation-role')
  await expect(role.locator('option')).toHaveCount(1)
  await expect(role.locator('option')).toHaveText(['Staff'])
})

test('team management does not overflow at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await signIn(page, 'manager.e2e@booktrix.test')
  await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible()
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflows).toBe(false)
})
