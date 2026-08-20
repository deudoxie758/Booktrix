import { expect, test } from '@playwright/test'

const publicJourneys = ['/', '/search', '/s/booktrix-e2e-studio']

for (const path of publicJourneys) {
  test(`${path} has no horizontal overflow`, async ({ page }) => {
    await page.goto(path)
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
  })
}

test('storefront service selection is keyboard operable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-320', 'Hardware Tab navigation is a desktop and tablet interaction')
  await page.goto('/s/booktrix-e2e-studio')
  const service = page.getByRole('checkbox', { name: 'E2E Deep Tissue Massage' })
  await service.focus()
  await page.keyboard.press('Space')
  await expect(service).toBeChecked()
  await expect(page.getByRole('status')).toHaveText(/1 service selected/i)
})

test('expired checkout hold exposes a semantic alert', async ({ page }) => {
  await page.goto('/book/booktrix-e2e-studio?services=missing&hold=booktrix-e2e-expired-hold')
  await expect(page.getByText(/your reserved time expired/i)).toBeFocused()
})
