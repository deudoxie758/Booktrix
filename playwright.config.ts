import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	use: {
		baseURL: 'http://127.0.0.1:3118',
		trace: 'retain-on-failure',
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['iPhone 13'] } },
	],
	webServer: {
		command: 'npm run dev -- --port 3118',
		url: 'http://127.0.0.1:3118',
		reuseExistingServer: false,
	},
})
