import { expect, test } from '@playwright/test'

test('visitor can browse the marketplace without authentication', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('heading', { name: /feel-good moment/i })).toBeVisible()
	await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
})

test('anonymous visitor is redirected from the business workspace', async ({ page }) => {
	await page.goto('/business')
	await expect(page).toHaveURL(/\/auth\/sign-in/)
	await expect(page.getByLabel('Email Address')).toBeVisible()
	await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	await expect(page.getByText(/application error/i)).not.toBeVisible()
})
