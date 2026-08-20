import { defineConfig, devices } from '@playwright/test'

// Defaults to a `next dev` server on 3118, matching every existing spec's
// assumptions. For the Task 6 release-gate run against a *built* app
// (`next start`, per DEPLOYMENT.md's release gate), start that server
// yourself against the same port and pass PLAYWRIGHT_SKIP_WEB_SERVER=1 so
// this config reuses it instead of also launching `next dev`:
//
//   PORT=3118 NEXTAUTH_URL=http://127.0.0.1:3118 npm run build && \
//   PORT=3118 NEXTAUTH_URL=http://127.0.0.1:3118 NEXTAUTH_SECRET=booktrix-playwright-test-secret npm start &
//   PLAYWRIGHT_SKIP_WEB_SERVER=1 npx playwright test
const port = process.env.PLAYWRIGHT_PORT ?? '3118'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`

export default defineConfig({
	testDir: './e2e',
	workers: 1,
	use: {
		baseURL,
		trace: 'retain-on-failure',
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		// A Chromium context emulating the iPad Mini viewport, not Playwright's
		// real `devices['iPad Mini']` preset (which runs WebKit). In this
		// environment WebKit auto-upgrades every plain-HTTP request to the local
		// dev server to HTTPS (no TLS listener exists here), so every navigation
		// fails with "A TLS error caused the secure connection to fail." before
		// a single cookie is ever set — authentication, and therefore every
		// authenticated spec, silently fails project-wide. Chromium does not
		// exhibit this behavior against 127.0.0.1. The viewport (768x1024) is
		// unchanged, so this still exercises the same below-`lg` breakpoint and
		// the same collapsible mobile navigation as `mobile-320`.
		{ name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true } },
		{ name: 'mobile-320', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true } },
	],
	webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER ? undefined : {
		command: `npm run dev -- --port ${port}`,
		url: baseURL,
		env: { NEXTAUTH_URL: baseURL, NEXTAUTH_SECRET: 'booktrix-playwright-test-secret' },
		reuseExistingServer: false,
	},
})
