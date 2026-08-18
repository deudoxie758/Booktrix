# Booktrix Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing Flo codebase into the secure, multi-business Booktrix foundation with contextual roles, approval and publication workflows, provider-neutral payments, and a responsive Modern Soft × Quiet Luxury interface.

**Architecture:** Keep one Next.js modular monolith, but move tenancy, authorization, business lifecycle, and payment contracts into focused domain modules. Preserve existing data through additive Prisma migrations, then route public, customer, business, accounts, and admin interfaces through shared server-side access helpers.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Prisma 6, MySQL, NextAuth 4, Tailwind CSS 3, Zod, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-08-18-booktrix-foundation-redesign-design.md`

## Global Constraints

- Product copy must use **Booktrix**; `Flo` is only the local project directory.
- Public marketplace browsing remains unauthenticated; booking checkout and all private workspaces require authentication.
- Business data is always scoped by business, and location-owned data is also scoped by location.
- Platform administration is global; owner, manager, accounts, and staff permissions come from contextual memberships.
- Initial money values are integer cents with explicit `XCD` currency.
- Payment domain code must not depend directly on Stripe or WiPay.
- Phase 1 defines the payment boundary but does not claim production WiPay processing.
- Use additive, data-preserving migrations; do not delete legacy columns until migrated behavior is verified.
- Sensitive lifecycle, permission, override, and financial changes create audit entries.
- All protected reads and writes require server-side authorization.
- Interfaces must be responsive, keyboard navigable, visibly focused, and reduced-motion aware.

## File Structure Map

- `modules/identity/` — session normalization and global administrator checks.
- `modules/organizations/` — membership authorization, applications, lifecycle transitions, setup, and publication.
- `modules/payments/` — provider-independent payment types and registry.
- `components/ui/` — small Booktrix primitives.
- `components/shells/` — public and authenticated navigation shells.
- `app/(public)/` — public marketplace and business-application routes.
- `app/(customer)/` — authenticated customer shell.
- `app/(business)/business/` — owner, manager, accounts, and staff workspace.
- `app/(admin)/admin/` — platform administration and application review.
- `tests/` — unit and integration tests; `e2e/` — Playwright journeys.

---

### Task 1: Establish the Automated Test Harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/smoke/environment.test.ts`
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: existing `@/*` TypeScript alias and Next.js application.
- Produces: `npm test`, `npm run test:watch`, `npm run test:e2e`, and `npm run verify` commands used by all later tasks.

- [ ] **Step 1: Add deterministic test scripts and development dependencies**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "verify": "npm run test && npm run typecheck && npm run build"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

Run `npm install` and commit the resulting `package-lock.json` changes.

- [ ] **Step 2: Write a failing alias-resolution smoke test**

```ts
// tests/smoke/environment.test.ts
import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('test environment', () => {
  it('resolves application aliases', () => expect(prisma).toBeDefined())
})
```

- [ ] **Step 3: Configure Vitest and Playwright**

```ts
// vitest.config.ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'] },
})
```

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest'
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:3000', reuseExistingServer: true },
})
```

- [ ] **Step 4: Add and run the public-page smoke journey**

```ts
// e2e/smoke.spec.ts
import { expect, test } from '@playwright/test'
test('public entry renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
})
```

Run: `npm test && npm run typecheck`
Expected: unit smoke test passes and TypeScript exits successfully.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts playwright.config.ts tests e2e
git commit -m "test: establish Booktrix test harness"
```

### Task 2: Add Multi-Business and Multi-Location Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_booktrix_organizations/migration.sql`
- Create: `scripts/backfill-organizations.ts`
- Create: `tests/organizations/schema.test.ts`

**Interfaces:**
- Consumes: legacy `User`, `Spa`, `Employee`, and `AuditLog` records.
- Produces: `Business`, `Location`, `BusinessMembership`, `LocationAssignment`, `BusinessApplication`, `BusinessSetup`, `BusinessStatus`, `BusinessRole`, and `ApplicationStatus` Prisma models/types.

- [ ] **Step 1: Write a failing schema contract test**

```ts
// tests/organizations/schema.test.ts
import { describe, expect, it } from 'vitest'
import { BusinessRole, BusinessStatus } from '@prisma/client'

describe('organization schema', () => {
  it('exposes contextual roles and lifecycle states', () => {
    expect(BusinessRole.MANAGER).toBe('MANAGER')
    expect(BusinessRole.ACCOUNTS).toBe('ACCOUNTS')
    expect(BusinessStatus.PUBLISHED).toBe('PUBLISHED')
  })
})
```

Run: `npm test -- tests/organizations/schema.test.ts`
Expected: FAIL because the generated enums do not exist.

- [ ] **Step 2: Add the organization enums and models**

```prisma
enum BusinessRole { OWNER MANAGER ACCOUNTS STAFF }
enum BusinessStatus { APPLICATION UNDER_REVIEW APPROVED SETUP PUBLISHED REJECTED SUSPENDED ARCHIVED }
enum ApplicationStatus { DRAFT SUBMITTED UNDER_REVIEW APPROVED REJECTED }

model Business {
  id String @id @default(cuid())
  name String
  slug String @unique
  status BusinessStatus @default(APPLICATION)
  defaultCurrency String @default("XCD")
  memberships BusinessMembership[]
  locations Location[]
  applications BusinessApplication[]
  setup BusinessSetup?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Location {
  id String @id @default(cuid())
  businessId String
  business Business @relation(fields: [businessId], references: [id])
  name String
  slug String
  timezone String @default("America/St_Lucia")
  address String?
  phone String?
  email String?
  isActive Boolean @default(true)
  assignments LocationAssignment[]
  @@unique([businessId, slug])
}

model BusinessMembership {
  id String @id @default(cuid())
  businessId String
  userId String
  role BusinessRole
  active Boolean @default(true)
  business Business @relation(fields: [businessId], references: [id])
  user User @relation(fields: [userId], references: [id])
  locations LocationAssignment[]
  @@unique([businessId, userId])
}

model LocationAssignment {
  membershipId String
  locationId String
  membership BusinessMembership @relation(fields: [membershipId], references: [id])
  location Location @relation(fields: [locationId], references: [id])
  @@id([membershipId, locationId])
}

model BusinessApplication {
  id String @id @default(cuid())
  businessId String
  applicantId String
  status ApplicationStatus @default(DRAFT)
  ownerName String
  email String
  phone String
  address String
  industry String
  serviceSummary String @db.Text
  decisionNote String? @db.Text
  submittedAt DateTime?
  reviewedAt DateTime?
  reviewerId String?
  business Business @relation(fields: [businessId], references: [id])
  applicant User @relation("BusinessApplicant", fields: [applicantId], references: [id])
  reviewer User? @relation("BusinessReviewer", fields: [reviewerId], references: [id])
}

model BusinessSetup {
  businessId String @id
  profileComplete Boolean @default(false)
  firstLocationComplete Boolean @default(false)
  policiesAccepted Boolean @default(false)
  publicationReady Boolean @default(false)
  business Business @relation(fields: [businessId], references: [id])
  updatedAt DateTime @updatedAt
}
```

Add the matching `businessMemberships`, `submittedBusinessApplications`, and `reviewedBusinessApplications` inverse relations to `User`. Preserve all legacy models and columns.

- [ ] **Step 3: Generate the additive migration and Prisma client**

Run: `npx prisma migrate dev --name booktrix_organizations`
Expected: migration creates only new tables, enums, indexes, and nullable relation columns.

- [ ] **Step 4: Implement and dry-run the legacy backfill**

```ts
for (const spa of await prisma.spa.findMany({ include: { Employees: true } })) {
  const business = await prisma.business.upsert({
    where: { slug: spa.slug },
    update: {},
    create: { name: spa.name, slug: spa.slug, status: 'SETUP', defaultCurrency: 'XCD' },
  })
  const location = await prisma.location.upsert({
    where: { businessId_slug: { businessId: business.id, slug: 'main' } },
    update: {},
    create: { businessId: business.id, name: spa.name, slug: 'main', address: spa.address, phone: spa.phone, email: spa.email },
  })
  await upsertMembershipWithLocation({ businessId: business.id, userId: spa.ownerId, role: 'OWNER', locationId: location.id })
  for (const employee of spa.Employees.filter((item) => item.userId)) {
    await upsertMembershipWithLocation({ businessId: business.id, userId: employee.userId!, role: 'STAFF', locationId: location.id })
  }
}
```

Add `--dry-run` and `--apply` modes; print counts and abort on slug collisions. Run dry-run against a database snapshot before apply.

- [ ] **Step 5: Run schema verification**

Run: `npx prisma validate && npx prisma generate && npm test -- tests/organizations/schema.test.ts`
Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add prisma scripts/backfill-organizations.ts tests/organizations/schema.test.ts
git commit -m "feat: add multi-business organization model"
```

### Task 3: Normalize Sessions and Enforce Contextual Authorization

**Files:**
- Modify: `lib/auth.ts`
- Replace: `lib/rbac.ts`
- Modify: `types/next-auth.d.ts`
- Create: `modules/identity/session.ts`
- Create: `modules/organizations/access.ts`
- Create: `tests/organizations/access.test.ts`

**Interfaces:**
- Consumes: `User.id`, global `User.role`, memberships, and location assignments.
- Produces: `getActor(): Promise<Actor | null>`, `requireActor()`, `requirePlatformAdmin()`, `requireBusinessAccess(businessId, roles?)`, and `requireLocationAccess(locationId, roles?)`.

- [ ] **Step 1: Write failing permission matrix tests**

```ts
// tests/organizations/access.test.ts
import { describe, expect, it } from 'vitest'
import { canAccessLocation } from '@/modules/organizations/access'

describe('location access', () => {
  it('allows an owner across their business', () =>
    expect(canAccessLocation({ role: 'OWNER', assignedLocationIds: [] }, 'loc-2')).toBe(true))
  it('denies a manager outside assigned locations', () =>
    expect(canAccessLocation({ role: 'MANAGER', assignedLocationIds: ['loc-1'] }, 'loc-2')).toBe(false))
  it('denies accounts users operational staff mutation', () =>
    expect(canAccessLocation({ role: 'ACCOUNTS', assignedLocationIds: ['loc-1'] }, 'loc-1', ['OWNER', 'MANAGER'])).toBe(false))
})
```

- [ ] **Step 2: Implement pure permission decisions**

```ts
export type MembershipAccess = { role: 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'STAFF'; assignedLocationIds: string[] }
export function canAccessLocation(access: MembershipAccess, locationId: string, allowed?: MembershipAccess['role'][]): boolean {
  if (allowed && !allowed.includes(access.role)) return false
  return access.role === 'OWNER' || access.assignedLocationIds.includes(locationId)
}
```

- [ ] **Step 3: Implement database-backed guards**

Each guard loads the session user by stable `token.sub`, queries the requested membership/location directly, returns a typed access context, and throws a single `AccessDeniedError` consumed by pages and route handlers. Never authorize by email or by a client-supplied role.

- [ ] **Step 4: Update session types and callbacks**

Keep only `id` and global platform role in the JWT/session. Do not serialize all memberships into the token because assignments must take effect without waiting for token expiry.

- [ ] **Step 5: Run the permission suite**

Run: `npm test -- tests/organizations/access.test.ts && npm run typecheck`
Expected: permission matrix passes and no `any` is needed in new authorization code.

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts lib/rbac.ts types/next-auth.d.ts modules/identity modules/organizations/access.ts tests/organizations/access.test.ts
git commit -m "feat: enforce contextual business permissions"
```

### Task 4: Implement Business Application and Lifecycle Services

**Files:**
- Create: `modules/organizations/application-schema.ts`
- Create: `modules/organizations/applications.ts`
- Create: `modules/organizations/lifecycle.ts`
- Create: `modules/organizations/audit.ts`
- Create: `tests/organizations/lifecycle.test.ts`

**Interfaces:**
- Consumes: authenticated actor, Prisma transaction client, organization models from Task 2.
- Produces: `submitBusinessApplication(input, actorId)`, `reviewBusinessApplication(input, adminId)`, `completeSetupStep(input, actor)`, and `publishBusiness(businessId, actor)`.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
it('cannot publish before approval and all setup requirements', async () => {
  await expect(publishBusiness('business-1', ownerActor)).rejects.toMatchObject({ code: 'BUSINESS_NOT_READY' })
})

it('records approval and audit atomically', async () => {
  const result = await reviewBusinessApplication({ applicationId: 'app-1', decision: 'APPROVED', note: 'Verified' }, adminId)
  expect(result.business.status).toBe('SETUP')
  expect(result.audit.action).toBe('BUSINESS_APPLICATION_APPROVED')
})
```

- [ ] **Step 2: Implement explicit lifecycle transition rules**

```ts
const transitions = {
  APPLICATION: ['UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['SETUP'],
  SETUP: ['PUBLISHED'],
  PUBLISHED: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['PUBLISHED', 'ARCHIVED'],
  REJECTED: ['ARCHIVED'],
  ARCHIVED: [],
} as const
```

Use one Prisma transaction for every state change and its audit entry.

- [ ] **Step 3: Validate application input with Zod**

Require legal/display name, owner name, email, phone, Saint Lucian address, industry/category, service summary, and acceptance of platform terms. Normalize email and phone before persistence.

- [ ] **Step 4: Run lifecycle tests**

Run: `npm test -- tests/organizations/lifecycle.test.ts`
Expected: valid transitions pass; invalid transitions, non-admin review, and incomplete publication fail.

- [ ] **Step 5: Commit**

```bash
git add modules/organizations tests/organizations/lifecycle.test.ts
git commit -m "feat: add business approval lifecycle"
```

### Task 5: Build the Booktrix Design System and Responsive Shells

**Files:**
- Modify: `tailwind.config.js`
- Replace: `styles/globals.css`
- Modify: `app/layout.tsx`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Field.tsx`
- Create: `components/ui/StatusBadge.tsx`
- Create: `components/shells/PublicHeader.tsx`
- Create: `components/shells/WorkspaceShell.tsx`
- Create: `components/shells/navigation.ts`
- Create: `tests/ui/navigation.test.tsx`

**Interfaces:**
- Consumes: `Actor` and contextual access from Task 3.
- Produces: shared tokens/primitives and `getWorkspaceNavigation(actor, memberships)` for all private workspaces.

- [ ] **Step 1: Write failing navigation visibility tests**

```tsx
it('shows finance but not staff management to accounts users', () => {
  const items = getWorkspaceNavigation(accountsActor, [accountsMembership])
  expect(items.map((item) => item.label)).toContain('Finance')
  expect(items.map((item) => item.label)).not.toContain('Staff')
})
```

- [ ] **Step 2: Define semantic visual tokens**

Replace turquoise `warm` colors with semantic `canvas`, `surface`, `cocoa`, `clay`, `sand`, `muted`, `success`, `warning`, and `danger` tokens. Add CSS variables for color, radius, shadow, display/body fonts, focus ring, and reduced motion. Preserve contrast of at least WCAG AA for body text and controls.

- [ ] **Step 3: Implement focused UI primitives**

Each component accepts native element props, exposes clear disabled/error/focus behavior, and contains no business logic. `Field` binds label, help, and error IDs for screen readers.

- [ ] **Step 4: Implement public and role-aware shells**

`PublicHeader` supports logo, discovery links, sign-in, and mobile menu. `WorkspaceShell` accepts `title`, `actor`, `memberships`, and children, rendering only navigation returned by `getWorkspaceNavigation`.

- [ ] **Step 5: Verify responsive and accessibility behavior**

Run: `npm test -- tests/ui/navigation.test.tsx && npm run typecheck`
Manually verify keyboard focus, 320px layout, reduced motion, and mobile menu dismissal.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js styles/globals.css app/layout.tsx components tests/ui/navigation.test.tsx
git commit -m "feat: create Booktrix visual system"
```

### Task 6: Redesign the Public Entry and Authentication Experience

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/join-us/page.tsx`
- Modify: `app/auth/sign-in/page.tsx`
- Modify: `app/auth/signup/page.tsx`
- Modify: `middleware.ts`
- Create: `e2e/public-auth.spec.ts`

**Interfaces:**
- Consumes: public shell and UI primitives from Task 5.
- Produces: public `/`, authenticated `/dashboard`, sign-in/sign-up flows, and middleware rules that do not gate public discovery.

- [ ] **Step 1: Write failing public/auth journeys**

```ts
test('visitor can browse home without authentication', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /feel-good moment/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
})
```

Add a second test proving `/business` redirects anonymous visitors to sign-in with a callback URL.

- [ ] **Step 2: Make `/` a public marketplace landing page**

Use real database storefront summaries where available, safe empty states, Booktrix copy, service/category search affordances, and no forced redirect. Avoid fabricated platform statistics.

- [ ] **Step 3: Redesign auth and post-login routing**

Customers land on `/dashboard`; platform admins land on `/admin`; users with business memberships can choose or resume `/business`. Keep credentials and Google sign-in while preserving callback URLs.

- [ ] **Step 4: Narrow middleware protection**

Protect customer profile, booking checkout, business, accounts, and admin routes. Do not protect `/`, search, category, or storefront detail routes.

- [ ] **Step 5: Run verification**

Run: `npm run test:e2e -- e2e/public-auth.spec.ts && npm run typecheck`
Expected: anonymous browsing and protected redirects pass on mobile and desktop projects.

- [ ] **Step 6: Commit**

```bash
git add app middleware.ts e2e/public-auth.spec.ts
git commit -m "feat: redesign public and authentication experience"
```

### Task 7: Add Business Application and Admin Review Interfaces

**Files:**
- Create: `app/(public)/for-business/page.tsx`
- Create: `app/(public)/for-business/apply/page.tsx`
- Create: `app/(public)/for-business/apply/actions.ts`
- Create: `app/(admin)/admin/applications/page.tsx`
- Create: `app/(admin)/admin/applications/[id]/page.tsx`
- Create: `app/(admin)/admin/applications/[id]/actions.ts`
- Modify: `app/admin/page.tsx`
- Create: `e2e/business-application.spec.ts`

**Interfaces:**
- Consumes: lifecycle services from Task 4, platform-admin guard from Task 3, UI system from Task 5.
- Produces: public application submission and audited administrator approval/rejection.

- [ ] **Step 1: Write the failing application journey**

Test required-field validation, successful submission, anonymous sign-in handoff, admin-only queue access, decision note, approval, and duplicate-submit prevention.

- [ ] **Step 2: Implement server actions as thin adapters**

```ts
'use server'
export async function submitApplicationAction(_: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor()
  const parsed = businessApplicationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors }
  const application = await submitBusinessApplication(parsed.data, actor.id)
  redirect(`/for-business/apply/success?id=${application.id}`)
}
```

- [ ] **Step 3: Implement the admin review queue**

Show submitted/under-review applications, applicant/business details, status filters, decision form, and audit history. Re-check admin access inside every action.

- [ ] **Step 4: Run journey and unit suites**

Run: `npm test -- tests/organizations && npm run test:e2e -- e2e/business-application.spec.ts`
Expected: lifecycle and browser journeys pass.

- [ ] **Step 5: Commit**

```bash
git add 'app/(public)/for-business' 'app/(admin)/admin' app/admin/page.tsx e2e/business-application.spec.ts
git commit -m "feat: add business application review flow"
```

### Task 8: Add the Role-Aware Business Workspace and Setup Gate

**Files:**
- Create: `app/(business)/business/layout.tsx`
- Create: `app/(business)/business/page.tsx`
- Create: `app/(business)/business/setup/page.tsx`
- Create: `app/(business)/business/setup/actions.ts`
- Create: `app/(business)/business/locations/page.tsx`
- Create: `app/(business)/business/team/page.tsx`
- Create: `app/(business)/business/finance/page.tsx`
- Create: `modules/organizations/context.ts`
- Create: `tests/organizations/context.test.ts`
- Create: `e2e/business-workspace.spec.ts`

**Interfaces:**
- Consumes: memberships/access guards, lifecycle/setup service, `WorkspaceShell`.
- Produces: `resolveBusinessContext(actorId, requestedBusinessId?, requestedLocationId?)` and authorized workspace routes.

- [ ] **Step 1: Write failing business-context tests**

Cover owner access to all locations, manager/accounts/staff assignment limits, switching between businesses, invalid requested IDs, and suspended-business read-only behavior.

- [ ] **Step 2: Implement deterministic context resolution**

Return `{ business, membership, availableLocations, activeLocation }`. Never default to a business the user does not belong to. Persist selection in a signed, server-read cookie only after validating membership.

- [ ] **Step 3: Implement workspace routes and setup checklist**

The workspace home shows representative role-specific panels. Setup collects business profile, first location, contact/policies acknowledgment, and marks the four Phase 1 readiness flags. Finance is a read-only Phase 1 shell clearly labeled until Phase 4.

- [ ] **Step 4: Implement publication gating**

Owners see “Publish” only when approved and all required flags are true. `publishBusiness` re-checks readiness transactionally; the UI state alone cannot authorize publication.

- [ ] **Step 5: Run access and workspace journeys**

Run: `npm test -- tests/organizations && npm run test:e2e -- e2e/business-workspace.spec.ts`
Expected: each role sees only allowed routes; direct forbidden URLs fail safely.

- [ ] **Step 6: Commit**

```bash
git add 'app/(business)' modules/organizations/context.ts tests/organizations/context.test.ts e2e/business-workspace.spec.ts
git commit -m "feat: add role-aware business workspace"
```

### Task 9: Introduce Provider-Neutral Payment Contracts

**Files:**
- Create: `modules/payments/types.ts`
- Create: `modules/payments/provider.ts`
- Create: `modules/payments/registry.ts`
- Create: `modules/payments/providers/unsupported.ts`
- Modify: `lib/stripe.ts`
- Modify: `app/api/stripe/webhook/route.ts`
- Create: `tests/payments/registry.test.ts`

**Interfaces:**
- Consumes: integer-cent amounts and explicit ISO currency.
- Produces: `PaymentProvider`, `PaymentRequest`, `PaymentResult`, `VerifiedPaymentEvent`, and `getPaymentProvider(name)`.

- [ ] **Step 1: Write failing provider-contract tests**

```ts
it('rejects an unconfigured provider without importing Stripe', async () => {
  const provider = getPaymentProvider('unconfigured')
  await expect(provider.createCheckout({ amountCents: 5000, currency: 'XCD', reference: 'order-1', returnUrl: 'https://booktrix.test/return' }))
    .rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_NOT_CONFIGURED' })
})
```

- [ ] **Step 2: Define the payment interface**

```ts
export interface PaymentProvider {
  createCheckout(input: PaymentRequest): Promise<PaymentResult>
  verifyReturn(input: URLSearchParams): Promise<VerifiedPaymentEvent>
  verifyWebhook(input: { rawBody: string; headers: Headers }): Promise<VerifiedPaymentEvent[]>
  refund(input: { providerPaymentId: string; amountCents: number }): Promise<VerifiedPaymentEvent>
}
```

- [ ] **Step 3: Isolate legacy Stripe code**

Keep the legacy route available only when explicitly configured, mark it deprecated in server logs, and ensure no organization, booking, or finance module imports `lib/stripe.ts`. Do not implement WiPay in Phase 1.

- [ ] **Step 4: Run dependency and contract checks**

Run: `npm test -- tests/payments/registry.test.ts && rg -n "@/lib/stripe|stripePiId" modules app/'(business)'`
Expected: tests pass and the search returns no new domain/workspace coupling.

- [ ] **Step 5: Commit**

```bash
git add modules/payments lib/stripe.ts app/api/stripe/webhook/route.ts tests/payments/registry.test.ts
git commit -m "refactor: isolate payment providers"
```

### Task 10: Adapt Legacy Routes and Verify Migration Compatibility

**Files:**
- Modify: `app/manager/page.tsx`
- Modify: `app/manager/actions.ts`
- Modify: `app/profile/manager/page.tsx`
- Modify: `app/admin/AdminPanel.tsx`
- Modify: `app/api/admin/users/route.ts`
- Modify: `app/api/admin/spas/route.ts`
- Modify: `app/api/manager/updateBookingStatus/route.ts`
- Modify: `prisma/seed.ts`
- Create: `tests/migrations/legacy-access.test.ts`

**Interfaces:**
- Consumes: contextual guards and backfilled organizations.
- Produces: redirects or adapters from retained legacy routes to new authorized workspaces, plus representative seed accounts for every role.

- [ ] **Step 1: Write failing legacy-access regression tests**

Assert that an old owner reaches their new business, a legacy employee cannot access unrelated locations, a customer cannot call manager/admin APIs, and an admin still has global access.

- [ ] **Step 2: Replace direct `User.role` authorization**

Every retained business route must call `requireBusinessAccess` or `requireLocationAccess`. Replace `OwnedSpas[0]` assumptions with validated business context. Redirect superseded pages to the matching new route while preserving query intent where practical.

- [ ] **Step 3: Update seed data**

Create one platform admin, customer, multi-location owner, location-limited manager, location-limited accounts user, and staff user. Use documented development-only credentials and idempotent upserts.

- [ ] **Step 4: Run regression checks**

Run: `npm test -- tests/migrations/legacy-access.test.ts && npm run typecheck`
Expected: all access cases pass and retained routes compile.

- [ ] **Step 5: Commit**

```bash
git add app prisma/seed.ts tests/migrations/legacy-access.test.ts
git commit -m "refactor: migrate legacy routes to contextual access"
```

### Task 11: Complete Phase 1 Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `DEPLOYMENT.md`
- Create: `docs/architecture/phase-1-foundation.md`
- Create: `e2e/tenant-isolation.spec.ts`
- Create: `e2e/responsive-accessibility.spec.ts`

**Interfaces:**
- Consumes: all Phase 1 deliverables.
- Produces: reproducible setup/migration/deployment instructions and final acceptance evidence.

- [ ] **Step 1: Add final negative and responsive journeys**

Test forged business/location IDs, direct forbidden routes, suspended businesses, anonymous public access, 320px public/auth/workspace layouts, keyboard-only navigation, form error focus, and reduced-motion rendering.

- [ ] **Step 2: Document exact environment and migration procedure**

Document required database/auth variables, optional Google variables, test database isolation, `prisma migrate deploy`, organization backfill dry-run/apply, rollback-by-forward-migration policy, seeding, build, and health verification. State clearly that WiPay is not live in Phase 1.

- [ ] **Step 3: Run the full verification gate**

Run:

```bash
npx prisma validate
npx prisma generate
npm test
npm run typecheck
npm run build
npm run test:e2e
git diff --check
```

Expected: every command exits `0`; no cross-tenant journey succeeds; no horizontal overflow appears at 320px.

- [ ] **Step 4: Audit requirements against the approved spec**

Confirm public browsing, contextual roles, multi-location tenancy, application/review/setup/publication, audit creation, responsive shells, payment isolation, migration preservation, and Phase 1 exclusions. Record command output and any intentionally deferred items in `docs/architecture/phase-1-foundation.md`.

- [ ] **Step 5: Commit**

```bash
git add README.md DEPLOYMENT.md docs/architecture e2e
git commit -m "docs: complete Booktrix Phase 1 handoff"
```
