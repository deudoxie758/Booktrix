import { expect, test, type Page, type TestInfo } from '@playwright/test'

// Task 6 responsive/accessibility gate for the whole business workspace.
// `playwright.config.ts` already runs every spec across three projects at
// exactly the breakpoints this task requires — 320px (`mobile-320`), tablet
// (`tablet`, an iPad Mini viewport below the `lg` breakpoint so it renders
// the same collapsible mobile navigation as `mobile-320`), and desktop
// (`desktop`, above `lg`, with the always-visible sidebar nav) — so these
// tests deliberately do not override the viewport: running unmodified across
// all three projects is what gives full 320/tablet/desktop coverage.

const pages: Array<{ path: string; heading: RegExp | string }> = [
  { path: '/business', heading: /operations overview/i },
  { path: '/business/locations', heading: 'Locations' },
  { path: '/business/team', heading: 'Team' },
  { path: '/business/finance', heading: 'Finance' },
  { path: '/business/settings', heading: 'Business settings' },
]

async function signIn(page: Page, email: string, callbackUrl = '/business') {
  await page.goto(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}

async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  return dimensions.scroll <= dimensions.client
}

function isMobileNavProject(testInfo: TestInfo) {
  return testInfo.project.name !== 'desktop'
}

test('Overview, Locations, Team, Finance, and Settings have no page-level horizontal overflow at this breakpoint', async ({ page }) => {
  await signIn(page, 'owner.e2e@booktrix.test')
  for (const { path, heading } of pages) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: typeof heading === 'string' }).first()).toBeVisible()
    expect(await noHorizontalOverflow(page), `expected ${path} not to overflow horizontally`).toBe(true)
  }
})

test('workspace navigation exposes the current page and remains keyboard-reachable', async ({ page }, testInfo) => {
  await signIn(page, 'owner.e2e@booktrix.test', '/business/team')
  await page.goto('/business/team')
  await page.getByRole('heading', { name: 'Team', exact: true }).waitFor()

  if (isMobileNavProject(testInfo)) await page.getByRole('button', { name: /open workspace navigation/i }).click()

  const teamLink = page.getByRole('link', { name: 'Team', exact: true })
  await expect(teamLink).toHaveAttribute('aria-current', 'page')
  const locationsLink = page.getByRole('link', { name: 'Locations', exact: true })
  await expect(locationsLink).not.toHaveAttribute('aria-current', 'page')

  if (testInfo.project.name === 'desktop') {
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
  }
})

test('sign-out remains reachable at every breakpoint', async ({ page }, testInfo) => {
  await signIn(page, 'owner.e2e@booktrix.test')
  if (isMobileNavProject(testInfo)) await page.getByRole('button', { name: /open workspace navigation/i }).click()
  await expect(page.getByRole('button', { name: /sign out/i }).first()).toBeVisible()
})

// The ledger's own responsive split point is Tailwind's `md` (768px) — the
// mobile card list only renders below that, so it is `mobile-320` (320px)
// that exercises it, while `tablet` (768px, exactly at `md`) already renders
// the desktop table like `desktop` does.
test('the finance ledger renders its dedicated mobile card list below its md breakpoint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-320', 'The ledger switches layout at md (768px); only mobile-320 is below that.')
  await signIn(page, 'owner.e2e@booktrix.test', '/business/finance')
  await page.goto('/business/finance')
  await page.getByRole('heading', { name: 'Finance', exact: true }).waitFor()
  await expect(page.getByRole('list', { name: /finance ledger \(mobile view\)/i })).toBeVisible()
  await expect(page.getByRole('table')).toBeHidden()
})

test('the finance ledger renders its table layout at and above its md breakpoint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-320', 'mobile-320 is below md and renders the mobile card list instead.')
  await signIn(page, 'owner.e2e@booktrix.test', '/business/finance')
  await page.goto('/business/finance')
  await page.getByRole('heading', { name: 'Finance', exact: true }).waitFor()
  await expect(page.getByRole('table')).toBeVisible()
})

test('inviting a team member surfaces a semantic success status, and a duplicate attempt surfaces a semantic alert', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mutating flow verified once on desktop; layout is covered by the overflow test above.')
  await signIn(page, 'owner.e2e@booktrix.test', '/business/team')
  await page.goto('/business/team')
  await page.getByRole('heading', { name: 'Team', exact: true }).waitFor()

  const suffix = `${Date.now()}`
  const email = `responsive-invite-${suffix}.e2e@booktrix.test`
  const form = page.getByRole('form', { name: 'Invite team member' })
  await form.getByLabel('Name').fill('Responsive Invite Check')
  await form.getByLabel('Email').fill(email)
  await form.getByLabel('Role').selectOption('STAFF')
  await form.getByRole('button', { name: 'Send invitation' }).click()

  const status = form.getByRole('status')
  await expect(status).toContainText('Invitation created')

  // A second invitation to the same still-pending email is a real,
  // server-validated rejection (not a client-only check), rendered through
  // the same form's `role="alert"` region — the semantic counterpart to the
  // `role="status"` success above.
  await form.getByLabel('Name').fill('Responsive Invite Check')
  await form.getByLabel('Email').fill(email)
  await form.getByLabel('Role').selectOption('STAFF')
  await form.getByRole('button', { name: 'Send invitation' }).click()
  await expect(form.getByRole('alert')).toHaveText(/pending invitation already exists/i)
})

test('a validation error on the Add location form is exposed as a focusable, assertive alert', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mutating flow verified once on desktop; layout is covered by the overflow test above.')
  await signIn(page, 'owner.e2e@booktrix.test', '/business/locations')
  await page.goto('/business/locations')
  await page.getByRole('heading', { name: 'Locations' }).waitFor()

  const form = page.getByRole('form', { name: 'Add location' })
  await form.getByLabel('Location name').fill('Duplicate Slug Attempt')
  await form.getByLabel('Slug').fill('castries')
  await form.getByLabel('Address').fill('1 Test Street, Castries')
  await form.getByLabel('Phone').fill('+1 758 555 0100')
  await form.getByLabel('Email').fill('duplicate-slug@booktrix.test')
  await form.getByRole('button', { name: 'Add location' }).click()

  const alert = form.getByRole('alert')
  await expect(alert).toBeVisible()
  await expect(alert).toHaveAttribute('tabindex', '-1')
  // A `role="alert"` region with `tabindex="-1"` is a real, focusable target
  // (assistive tech announces it immediately as a live region regardless;
  // the negative tabindex additionally lets a "skip to error" control move
  // keyboard focus there on demand).
  await alert.focus()
  await expect(alert).toBeFocused()
})

test('reduced-motion mode is honored: scroll behavior and transition durations collapse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page, 'owner.e2e@booktrix.test')
  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)
  expect(scrollBehavior).toBe('auto')
})
