import { expect, test } from '@playwright/test'

for (const path of ['/business', '/business/finance', '/admin', '/admin/applications']) {
	test(`anonymous access to ${path} is denied`, async ({ page }) => {
		await page.goto(path)
		await expect(page).toHaveURL(/\/auth\/sign-in/)
	})
}
