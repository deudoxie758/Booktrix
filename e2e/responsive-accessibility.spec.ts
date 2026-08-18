import { expect, test } from '@playwright/test'

test('public marketplace has no horizontal overflow at 320px', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 })
	await page.goto('/')
	const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
	expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
})

test('keyboard focus reaches public actions', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'mobile', 'Hardware Tab navigation is a desktop interaction')
	await page.goto('/')
	await page.keyboard.press('Tab')
	await expect(page.locator(':focus')).toBeVisible()
})
