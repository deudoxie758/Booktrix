import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Task 6 cross-role authorization gate. Every scenario below attempts both a
// direct URL and a direct mutation against a resource the signed-in actor is
// not authorized for, proving the server-side boundary holds independently
// of what the UI happens to render or hide.
//
// "Direct mutation" technique: Next.js server actions bound to a form (even
// ones wrapped in a client `onSubmit` handler) are, on the wire, a real POST
// to the page URL carrying a `next-action` header and a multipart body whose
// field values are plain text. Two adversarial techniques are used here,
// both operating on that real wire request rather than on React/DOM
// internals, so they are robust to component implementation details:
//
//  - Forged field: capture (or intercept) a legitimate request and rewrite a
//    plaintext field value (a role, or a foreign resource id) before it
//    reaches the server, exactly as request-tampering tooling (e.g. a proxy)
//    would. The server must reject it despite the client never rendering
//    that choice.
//  - Captured replay: capture a legitimate request made by an authorized
//    actor (the `next-action` id is a stable reference to the compiled
//    action, not tied to a session) and replay the exact same request under
//    a *different*, unauthorized actor's authenticated session. The server
//    must reject it purely on role/scope, proving the boundary does not rely
//    on the UI ever withholding the control.

// Every navigation and request below uses a relative path so it resolves
// against Playwright's configured `baseURL` (http://127.0.0.1:3118 for the
// default `next dev` run, or a proxied https://127.0.0.1:3119 origin for a
// built-app verification run) — never a hardcoded absolute origin, which
// would silently bypass the configured origin (and its auth cookies) under
// any baseURL other than the default.

// Next.js dev mode occasionally aborts a navigation to a page that throws
// during server rendering (net::ERR_ABORTED) when it immediately follows
// another such navigation in the same test — a dev-only HMR/error-overlay
// race, not present in a production `next start` server. One retry clears
// it reliably without weakening the assertion (the retried navigation still
// must resolve to a non-ok response).
async function gotoExpectingDenial(page: Page, path: string) {
  try {
    return await page.goto(path)
  } catch (error) {
    if (error instanceof Error && error.message.includes('ERR_ABORTED')) return page.goto(path)
    throw error
  }
}

async function signIn(page: Page, email: string, callbackUrl = '/business') {
  await page.goto(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
  if (!page.url().includes(callbackUrl)) await page.goto(callbackUrl)
}

type CapturedAction = { url: string; headers: Record<string, string>; postData: string }

async function captureAction(page: Page, pathGlob: string, submit: () => Promise<void>): Promise<CapturedAction> {
  let captured: CapturedAction | null = null
  await page.route(pathGlob, async (route) => {
    const request = route.request()
    if (request.method() === 'POST' && request.headers()['next-action'] && !captured) {
      captured = { url: request.url(), headers: request.headers(), postData: request.postData() ?? '' }
    }
    await route.continue()
  })
  await submit()
  await page.unroute(pathGlob)
  if (!captured) throw new Error(`No server action request was captured for ${pathGlob}`)
  return captured
}

function replay(requestContext: APIRequestContext, captured: CapturedAction, postData?: string) {
  return requestContext.post(captured.url, {
    headers: { 'next-action': captured.headers['next-action'], 'content-type': captured.headers['content-type'], accept: 'text/x-component' },
    data: postData ?? captured.postData,
  })
}

function forgeField(postData: string, fromValue: string, toValue: string) {
  expect(postData.includes(fromValue)).toBe(true)
  return postData.split(fromValue).join(toValue)
}

test.describe('Cross-role authorization: Manager', () => {
  test('Manager cannot reach Finance or Settings by direct URL', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    await signIn(page, 'manager.e2e@booktrix.test')
    const finance = await gotoExpectingDenial(page, '/business/finance')
    expect(finance?.ok()).toBeFalsy()
    const settings = await gotoExpectingDenial(page, '/business/settings')
    expect(settings?.ok()).toBeFalsy()
  })

  test('Manager cannot grant Manager or Accounts via a forged new-invitation request', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    await signIn(page, 'manager.e2e@booktrix.test', '/business/team')
    await page.getByRole('heading', { name: 'Team', exact: true }).waitFor()

    await page.route('**/business/team', async (route) => {
      const request = route.request()
      if (request.method() !== 'POST' || !request.headers()['next-action']) return route.continue()
      const postData = request.postData()
      if (postData && postData.includes('name="1_role"\r\n\r\nSTAFF')) {
        return route.continue({ postData: postData.replace('name="1_role"\r\n\r\nSTAFF', 'name="1_role"\r\n\r\nMANAGER') })
      }
      return route.continue()
    })

    const form = page.getByRole('form', { name: 'Invite team member' })
    await form.getByLabel('Name').fill('Forged Manager Invite')
    await form.getByLabel('Email').fill('forged-manager-invite.e2e@booktrix.test')
    await form.getByRole('button', { name: 'Send invitation' }).click()

    await expect(form.getByRole('alert')).toHaveText('You cannot invite that role.')
  })

  test('Manager cannot grant Manager or Accounts to an in-scope member via a forged access-update request', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    await signIn(page, 'manager.e2e@booktrix.test', '/business/team')
    await page.getByRole('heading', { name: 'Team', exact: true }).waitFor()

    await page.route('**/business/team', async (route) => {
      const request = route.request()
      if (request.method() !== 'POST' || !request.headers()['next-action']) return route.continue()
      const postData = request.postData()
      if (postData && postData.includes('name="1_role"\r\n\r\nSTAFF') && postData.includes('membershipId')) {
        return route.continue({ postData: postData.replace('name="1_role"\r\n\r\nSTAFF', 'name="1_role"\r\n\r\nMANAGER') })
      }
      return route.continue()
    })

    const card = page.locator('article', { hasText: 'Priya E2E' }).first()
    await card.waitFor()
    await card.getByText('Edit access', { exact: true }).click()
    await card.getByRole('button', { name: /^save access$/i }).click()

    await expect(card.getByRole('alert')).toHaveText('You cannot manage that team role.')
  })
})

test.describe('Cross-role authorization: Staff', () => {
  test('Staff cannot reach Team, Locations, Finance, or Settings by direct URL', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    await signIn(page, 'staff.e2e@booktrix.test')
    for (const path of ['/business/team', '/business/locations', '/business/finance', '/business/settings']) {
      const response = await gotoExpectingDenial(page, path)
      expect.soft(response?.ok(), `expected ${path} to deny Staff`).toBeFalsy()
    }
  })

  test('Staff cannot mutate schedule, locations, team, or finance via a replayed authorized request', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')

    // Capture a real, valid saveStaffScheduleAction request as Owner (a true
    // no-op resave of already-seeded hours), then replay it verbatim under
    // Staff's own authenticated session.
    const ownerContext = await browser.newContext()
    const ownerPage = await ownerContext.newPage()
    await signIn(ownerPage, 'owner.e2e@booktrix.test', '/business/schedule')
    await ownerPage.getByRole('heading', { name: 'Staff schedules' }).waitFor()
    const scheduleForm = ownerPage.locator('form', { hasText: 'Weekly staff hours' })
    const capturedSchedule = await captureAction(ownerPage, '**/business/schedule', async () => {
      await scheduleForm.getByLabel('Professional').selectOption({ label: 'Amara E2E' })
      await scheduleForm.getByLabel('Location').selectOption({ label: 'E2E Castries Studio' })
      await scheduleForm.getByLabel('Weekday').selectOption('1')
      await scheduleForm.getByLabel('Start time').fill('09:00')
      await scheduleForm.getByLabel('End time').fill('17:00')
      await scheduleForm.getByRole('button', { name: /save weekly hours/i }).click()
      await ownerPage.waitForTimeout(500)
    })

    // Capture a real setLocationActiveAction request as Owner.
    await ownerPage.goto(`/business/locations`)
    await ownerPage.getByRole('heading', { name: 'Locations' }).waitFor()
    const capturedLocation = await captureAction(ownerPage, '**/business/locations', async () => {
      const button = ownerPage.getByRole('button', { name: /deactivate location|activate location/i }).first()
      await button.waitFor()
      ownerPage.once('dialog', (dialog) => dialog.accept())
      await button.click()
      await ownerPage.waitForTimeout(500)
      // Restore original state so this capture step has no lasting effect.
      const restore = ownerPage.getByRole('button', { name: /deactivate location|activate location/i }).first()
      ownerPage.once('dialog', (dialog) => dialog.accept())
      await restore.click()
      await ownerPage.waitForTimeout(500)
    })

    // Capture a real updateMemberAccessAction request as Owner.
    await ownerPage.goto(`/business/team`)
    await ownerPage.getByRole('heading', { name: 'Team', exact: true }).waitFor()
    const teamCard = ownerPage.locator('article', { hasText: 'Priya E2E' }).first()
    await teamCard.waitFor()
    await teamCard.getByText('Edit access', { exact: true }).click()
    const capturedTeam = await captureAction(ownerPage, '**/business/team', async () => {
      await teamCard.getByRole('button', { name: /^save access$/i }).click()
      await ownerPage.waitForTimeout(500)
    })
    await ownerContext.close()

    // Capture a real recordCashCollectionAction request as Accounts.
    const accountsContext = await browser.newContext()
    const accountsPage = await accountsContext.newPage()
    await signIn(accountsPage, 'accounts.e2e@booktrix.test', '/business/finance')
    await accountsPage.getByRole('heading', { name: 'Finance', exact: true }).waitFor()
    const financeRow = accountsPage.locator('tr', { hasText: 'booktrix-e2e-order-cash-due-castries' }).first()
    await financeRow.waitFor()
    const capturedFinance = await captureAction(accountsPage, '**/business/finance', async () => {
      await financeRow.getByText('Record cash collected', { exact: true }).first().click()
      await financeRow.getByLabel(/amount collected/i).fill('1')
      await financeRow.getByRole('button', { name: /^record cash collected$/i }).click()
      await accountsPage.waitForTimeout(500)
    })
    await accountsContext.close()

    // Replay every captured request under Staff's own authenticated session.
    const staffContext = await browser.newContext()
    const staffPage = await staffContext.newPage()
    await signIn(staffPage, 'staff.e2e@booktrix.test')

    const scheduleReplay = await replay(staffContext.request, capturedSchedule)
    expect(scheduleReplay.ok()).toBeFalsy()

    const locationReplay = await replay(staffContext.request, capturedLocation)
    expect(locationReplay.ok()).toBeFalsy()

    const teamReplay = await replay(staffContext.request, capturedTeam)
    expect(teamReplay.ok()).toBeFalsy()

    const financeReplay = await replay(staffContext.request, capturedFinance)
    expect(financeReplay.ok()).toBeFalsy()

    await staffContext.close()
  })
})

test.describe('Cross-role authorization: Accounts', () => {
  test('Accounts cannot collect cash for an order at an unassigned location via a forged order id', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    const ownOrderId = 'booktrix-e2e-order-cash-due-castries'
    const foreignOrderId = 'booktrix-e2e-order-cash-due-rodney'

    await signIn(page, 'accounts.e2e@booktrix.test', '/business/finance')
    await page.getByRole('heading', { name: 'Finance', exact: true }).waitFor()

    await page.route('**/business/finance', async (route) => {
      const request = route.request()
      if (request.method() !== 'POST' || !request.headers()['next-action']) return route.continue()
      const postData = request.postData()
      if (postData && postData.includes(`name="1_orderId"\r\n\r\n${ownOrderId}`)) {
        return route.continue({ postData: postData.replace(`name="1_orderId"\r\n\r\n${ownOrderId}`, `name="1_orderId"\r\n\r\n${foreignOrderId}`) })
      }
      return route.continue()
    })

    const row = page.locator('tr', { hasText: ownOrderId }).first()
    await row.waitFor()
    await row.getByText('Record cash collected', { exact: true }).first().click()
    await row.getByLabel(/amount collected/i).fill('10')
    await row.getByRole('button', { name: /^record cash collected$/i }).click()

    await expect(row.getByRole('alert')).toHaveText('Choose only bookings at locations you are authorized to manage.')
  })

  test('Accounts cannot mutate locations, team, or settings via a replayed authorized request', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')

    const ownerContext = await browser.newContext()
    const ownerPage = await ownerContext.newPage()
    await signIn(ownerPage, 'owner.e2e@booktrix.test', '/business/locations')
    await ownerPage.getByRole('heading', { name: 'Locations' }).waitFor()
    const capturedLocation = await captureAction(ownerPage, '**/business/locations', async () => {
      const button = ownerPage.getByRole('button', { name: /deactivate location|activate location/i }).first()
      await button.waitFor()
      ownerPage.once('dialog', (dialog) => dialog.accept())
      await button.click()
      await ownerPage.waitForTimeout(500)
      const restore = ownerPage.getByRole('button', { name: /deactivate location|activate location/i }).first()
      ownerPage.once('dialog', (dialog) => dialog.accept())
      await restore.click()
      await ownerPage.waitForTimeout(500)
    })

    await ownerPage.goto(`/business/team`)
    await ownerPage.getByRole('heading', { name: 'Team', exact: true }).waitFor()
    const teamCard = ownerPage.locator('article', { hasText: 'Priya E2E' }).first()
    await teamCard.waitFor()
    await teamCard.getByText('Edit access', { exact: true }).click()
    const capturedTeam = await captureAction(ownerPage, '**/business/team', async () => {
      await teamCard.getByRole('button', { name: /^save access$/i }).click()
      await ownerPage.waitForTimeout(500)
    })

    await ownerPage.goto(`/business/settings`)
    await ownerPage.getByRole('heading', { name: 'Business settings' }).waitFor()
    const policyForm = ownerPage.getByRole('form', { name: 'Booking policy' })
    const capturedSettings = await captureAction(ownerPage, '**/business/settings', async () => {
      await policyForm.getByRole('button', { name: /save booking policy/i }).click()
      await ownerPage.waitForTimeout(500)
    })
    await ownerContext.close()

    const accountsContext = await browser.newContext()
    const accountsPage = await accountsContext.newPage()
    await signIn(accountsPage, 'accounts.e2e@booktrix.test')

    expect((await replay(accountsContext.request, capturedLocation)).ok()).toBeFalsy()
    expect((await replay(accountsContext.request, capturedTeam)).ok()).toBeFalsy()
    expect((await replay(accountsContext.request, capturedSettings)).ok()).toBeFalsy()

    await accountsContext.close()
  })
})

test.describe('Cross-role authorization: Owner cross-tenant forgery', () => {
  test('Owner cannot deactivate a location belonging to another business via a forged location id', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    const ownLocationId = 'booktrix-e2e-location-castries'
    const foreignLocationId = 'booktrix-e2e-location-sole-castries'

    await signIn(page, 'owner.e2e@booktrix.test', '/business/locations')
    await page.getByRole('heading', { name: 'Locations' }).waitFor()

    await page.route('**/business/locations', async (route) => {
      const request = route.request()
      if (request.method() !== 'POST' || !request.headers()['next-action']) return route.continue()
      const postData = request.postData()
      if (postData && postData.includes(ownLocationId)) return route.continue({ postData: forgeField(postData, ownLocationId, foreignLocationId) })
      return route.continue()
    })

    const button = page.getByRole('button', { name: /deactivate location|activate location/i }).first()
    await button.waitFor()
    page.once('dialog', (dialog) => dialog.accept())
    await button.click()

    await expect(page.getByRole('alert').first()).toBeVisible()
  })

  test('Owner cannot edit a team membership belonging to another business via a forged membership id', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    const ownMembershipId = 'booktrix-e2e-membership-staff-castries'
    const foreignMembershipId = 'booktrix-e2e-member-sole-owner'

    await signIn(page, 'owner.e2e@booktrix.test', '/business/team')
    await page.getByRole('heading', { name: 'Team', exact: true }).waitFor()

    await page.route('**/business/team', async (route) => {
      const request = route.request()
      if (request.method() !== 'POST' || !request.headers()['next-action']) return route.continue()
      const postData = request.postData()
      if (postData && postData.includes(`name="1_membershipId"\r\n\r\n${ownMembershipId}`)) {
        return route.continue({ postData: forgeField(postData, ownMembershipId, foreignMembershipId) })
      }
      return route.continue()
    })

    const card = page.locator('article', { hasText: 'Priya E2E' }).first()
    await card.waitFor()
    await card.getByText('Edit access', { exact: true }).click()
    await card.getByRole('button', { name: /^save access$/i }).click()

    await expect(card.getByRole('alert')).toBeVisible()
  })

  test('Owner cannot record cash collection against a forged, non-existent order id', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    const ownOrderId = 'booktrix-e2e-order-cash-due-castries'
    const foreignOrderId = 'booktrix-e2e-order-nonexistent-forged'

    await signIn(page, 'owner.e2e@booktrix.test', '/business/finance')
    await page.getByRole('heading', { name: 'Finance', exact: true }).waitFor()

    await page.route('**/business/finance', async (route) => {
      const request = route.request()
      if (request.method() !== 'POST' || !request.headers()['next-action']) return route.continue()
      const postData = request.postData()
      if (postData && postData.includes(`name="1_orderId"\r\n\r\n${ownOrderId}`)) {
        return route.continue({ postData: postData.replace(`name="1_orderId"\r\n\r\n${ownOrderId}`, `name="1_orderId"\r\n\r\n${foreignOrderId}`) })
      }
      return route.continue()
    })

    const row = page.locator('tr', { hasText: ownOrderId }).first()
    await row.waitFor()
    await row.getByText('Record cash collected', { exact: true }).first().click()
    await row.getByLabel(/amount collected/i).fill('1')
    await row.getByRole('button', { name: /^record cash collected$/i }).click()

    await expect(row.getByRole('alert')).toHaveText('This booking could not be found.')
  })
})

test.describe('Invitation lifecycle', () => {
  test('an expired invitation cannot be accepted or replayed', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    await signIn(page, 'customer.e2e@booktrix.test')
    const response = await context.request.post(`/api/team-invitations/accept`, { form: { token: 'booktrix-e2e-invitation-token-expired-0001' }, maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers()['location']).toContain('error=INVITATION_EXPIRED')
  })

  test('a revoked invitation cannot be accepted or replayed', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    await signIn(page, 'customer.e2e@booktrix.test')
    const response = await context.request.post(`/api/team-invitations/accept`, { form: { token: 'booktrix-e2e-invitation-token-revoked-0001' }, maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers()['location']).toContain('error=INVITATION_REVOKED')
  })

  test('a pending invitation cannot be accepted by a signed-in account with a mismatched email', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    await signIn(page, 'customer.e2e@booktrix.test')
    const response = await context.request.post(`/api/team-invitations/accept`, { form: { token: 'booktrix-e2e-invitation-token-pending-0001' }, maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers()['location']).toContain('error=INVITATION_EMAIL_MISMATCH')
  })
})

test.describe('Business selection recovery', () => {
  test('a stale selected-business cookie recovers to an active authorized membership', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Server-side authorization is viewport-independent; verified once on desktop.')
    await context.addCookies([{ name: 'booktrix-business', value: 'booktrix-e2e-business-sole-wellness-house', domain: '127.0.0.1', path: '/' }])
    await signIn(page, 'owner.e2e@booktrix.test')
    const response = await page.goto(`/business`)
    expect(response?.ok()).toBeTruthy()
    await expect(page.getByText('Booktrix E2E Studio')).toBeVisible()
  })
})
