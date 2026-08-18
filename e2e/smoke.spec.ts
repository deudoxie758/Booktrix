import { expect, test } from '@playwright/test'

test('public entry renders', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('body')).toBeVisible()
})
