import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/sign-in?callbackUrl=/business')
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}

test('each business role lands on its role-aware overview', async ({ page }) => {
  for (const [email, heading] of [
    ['owner.e2e@booktrix.test', /operations overview/i],
    ['manager.e2e@booktrix.test', /operations overview/i],
    ['staff.e2e@booktrix.test', /my schedule overview/i],
    ['accounts.e2e@booktrix.test', /finance overview/i],
  ] as const) {
    await signIn(page, email)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    await page.getByRole('button', { name: /sign out/i }).click()
    await page.waitForURL('/')
  }
})

test('mobile navigation exposes the same workspace and account destinations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await signIn(page, 'manager.e2e@booktrix.test')
  await page.getByRole('button', { name: /open workspace navigation/i }).click()
  await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible()
  await expect(page.getByRole('link', { name: /view marketplace/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /my account/i })).toBeVisible()
})
