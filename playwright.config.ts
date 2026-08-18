import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:3118',
		trace: 'retain-on-failure',
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'tablet', use: { ...devices['iPad Mini'] } },
		{ name: 'mobile-320', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true } },
	],
	webServer: {
		command: 'npm run dev -- --port 3118',
		url: 'http://127.0.0.1:3118',
		env: { NEXTAUTH_URL: 'http://127.0.0.1:3118', NEXTAUTH_SECRET: 'booktrix-playwright-test-secret' },
		reuseExistingServer: false,
	},
})
