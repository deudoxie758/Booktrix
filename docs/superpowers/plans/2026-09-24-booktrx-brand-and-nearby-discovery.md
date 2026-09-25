# Booktrx Brand and Nearby Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the visible product to Booktrx, generalize customer-facing location language, and let customers explicitly use their device location to rank nearby service businesses.

**Architecture:** Preserve compatibility-sensitive `booktrix` identifiers while centralizing visible Booktrx copy. Extend locations with optional coordinates managed by authorized business users, then pass validated customer coordinates through search without storing them. A pure Haversine distance module ranks storefronts by their nearest active service location, while a client-side search control owns browser geolocation permission and failure states.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Prisma 6, MySQL, Tailwind CSS, Zod, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-09-24-booktrx-customer-operations-expansion-design.md`

## Global Constraints

- Visible customer-facing and business-facing presentation uses **Booktrx**.
- Existing database identifiers, migration history, cookie names, environment variable names, seeded test namespaces, and external references may retain `booktrix` when compatibility requires it.
- Saint Lucia remains the initial operating market with XCD and `America/St_Lucia`; legitimate addresses, timezone rules, and seed content may still name Saint Lucia.
- Device location is requested only after the customer selects **Use my location**.
- Manual search remains available when permission is denied, positioning times out, positioning fails, or geolocation is unsupported.
- Precise customer coordinates are not persisted, attached to a booking, logged, placed in analytics, or exposed to a business.
- Location coordinate changes require existing Owner or location-scoped Manager authorization.
- Use forward-only Prisma migrations and preserve all existing records.

## Review Focus

- Invalid, non-finite, or out-of-range URL coordinates must be ignored without breaking manual search; Task 3 pins this behavior.
- A business with several locations must be ranked by its nearest valid location, not by whichever row is returned first; Task 3 pins this behavior.
- Equal-distance storefronts need deterministic ordering across requests; Task 3 pins the name/slug tie-break behavior.
- Denied, unavailable, timed-out, and unsupported geolocation must keep the search form usable and announce a helpful message; Task 4 pins each state.
- The visible rename must not alter the `booktrix-business` cookie, `booktrix-e2e-*` fixtures, service health identifier, migration history, or existing URLs; Task 1 pins compatibility exclusions.

---

### Task 1: Visible Booktrx Brand and Generalized Copy

**Files:**
- Create: `lib/brand.ts`
- Create: `tests/brand/presentation.test.ts`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/search/page.tsx`
- Modify: `app/for-business/page.tsx`
- Modify: `app/for-business/apply/page.tsx`
- Modify: `app/for-business/apply/BusinessApplicationForm.tsx`
- Modify: `app/for-business/apply/success/page.tsx`
- Modify: `app/join-us/page.tsx`
- Modify: `app/auth/sign-in/page.tsx`
- Modify: `app/auth/signup/page.tsx`
- Modify: `app/auth/components/AuthShell.tsx`
- Modify: `app/auth/components/SignInForm.tsx`
- Modify: `app/profile/AccountHub.tsx`
- Modify: `app/profile/bookings/page.tsx`
- Modify: `app/invitations/[token]/page.tsx`
- Modify: `app/s/[slug]/page.tsx`
- Modify: `components/shells/PublicHeader.tsx`
- Modify: `components/shells/WorkspaceShell.tsx`
- Modify: `components/business/BookingPolicyForm.tsx`
- Modify: `components/business/PublicationSettings.tsx`
- Modify: `components/marketplace/MarketplaceHero.tsx`
- Modify: `components/marketplace/SearchFilters.tsx`
- Modify: `modules/notifications/booking-events.ts`
- Modify: `modules/profile/account-hub.ts`
- Modify: `app/business/settings/actions.ts`
- Modify: `README.md`
- Test: `tests/ui/marketplace-hero.test.tsx`
- Test: `tests/ui/search-filters.test.tsx`
- Test: `tests/ui/navigation.test.ts`

**Interfaces:**
- Consumes: Existing page, shell, notification, and account-hub presentation strings.
- Produces: `BRAND_NAME: 'Booktrx'`, `BRAND_WORDMARK: 'booktrx'`, and `SERVICE_BUSINESS_LABEL: 'Service-based businesses'` from `lib/brand.ts`.

- [ ] **Step 1: Write the failing brand boundary test**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const presentationFiles = [
  'app/layout.tsx', 'app/page.tsx', 'app/search/page.tsx',
  'components/shells/PublicHeader.tsx', 'components/shells/WorkspaceShell.tsx',
  'components/marketplace/MarketplaceHero.tsx',
]

describe('Booktrx presentation brand', () => {
  it('uses Booktrx in active presentation while preserving compatibility identifiers', () => {
    for (const file of presentationFiles) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/Booktrix|booktrix\./)
    }
    expect(readFileSync('modules/organizations/workspace-selection.ts', 'utf8')).toContain("'booktrix-business'")
    expect(readFileSync('lib/readiness.ts', 'utf8')).toContain("service: 'booktrix'")
  })
})
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- tests/brand/presentation.test.ts tests/ui/marketplace-hero.test.tsx tests/ui/search-filters.test.tsx tests/ui/navigation.test.ts`

Expected: FAIL because active files still render Booktrix and Saint Lucia-specific discovery labels.

- [ ] **Step 3: Add brand constants and update active presentation copy**

```ts
export const BRAND_NAME = 'Booktrx' as const
export const BRAND_WORDMARK = 'booktrx' as const
export const SERVICE_BUSINESS_LABEL = 'Service-based businesses' as const
```

Use `Booktrx` in visible copy, `booktrx.` in wordmarks, “Service-based businesses” for the marketplace collection heading, and “Location” for the search field. Replace “Made for Saint Lucia,” “Discover Saint Lucia,” “Saint Lucian service businesses,” and fallback “Saint Lucia” UI labels with market-neutral wording. Keep real addresses, XCD policy copy, and the `America/St_Lucia` timezone unchanged.

- [ ] **Step 4: Run focused tests and static checks**

Run: `npm test -- tests/brand/presentation.test.ts tests/ui/marketplace-hero.test.tsx tests/ui/search-filters.test.tsx tests/ui/navigation.test.ts && npm run typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit the brand slice**

```bash
git add lib/brand.ts tests/brand/presentation.test.ts app components modules README.md
git commit -m "feat: rename visible product brand to Booktrx"
```

---

### Task 2: Authorized Location Coordinates

**Files:**
- Create: `prisma/migrations/20260924090000_location_coordinates/migration.sql`
- Modify: `prisma/schema.prisma`
- Modify: `modules/locations/schema.ts`
- Modify: `modules/locations/management.ts`
- Modify: `app/business/locations/actions.ts`
- Modify: `components/business/LocationEditor.tsx`
- Modify: `components/business/LocationCard.tsx`
- Modify: `prisma/seed.ts`
- Modify: `scripts/seed-phase2-e2e.ts`
- Test: `tests/locations/schema.test.ts`
- Test: `tests/locations/management.test.ts`
- Test: `tests/locations/repository.test.ts`
- Test: `tests/locations/actions.test.ts`
- Test: `tests/ui/location-management.test.tsx`

**Interfaces:**
- Consumes: Existing `LocationValuesInput`, `NormalizedLocationValues`, `ManagedLocation`, and location authorization transactions.
- Produces: Optional `latitude: number | null`, `longitude: number | null`, and `coordinateSource: 'MANUAL' | null` on managed locations.

- [ ] **Step 1: Write failing coordinate validation and authorization tests**

```ts
it('accepts a complete coordinate pair and rejects partial or out-of-range coordinates', () => {
  expect(parseLocationValues({ ...valid, latitude: 14.0101, longitude: -60.9875 }).ok).toBe(true)
  expect(parseLocationValues({ ...valid, latitude: 14.0101, longitude: null })).toMatchObject({ ok: false })
  expect(parseLocationValues({ ...valid, latitude: 91, longitude: -60.9875 })).toMatchObject({ ok: false })
})
```

Extend existing management/repository tests to prove an assigned Manager can update coordinates for an assigned location, while cross-location and cross-business updates remain denied inside the transaction.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/locations/schema.test.ts tests/locations/management.test.ts tests/locations/repository.test.ts tests/locations/actions.test.ts tests/ui/location-management.test.tsx`

Expected: FAIL because coordinate fields do not exist.

- [ ] **Step 3: Add the forward-only schema migration**

```sql
ALTER TABLE `Location`
  ADD COLUMN `latitude` DECIMAL(9,6) NULL,
  ADD COLUMN `longitude` DECIMAL(9,6) NULL,
  ADD COLUMN `coordinateSource` VARCHAR(20) NULL;
```

Represent Prisma values as `Decimal?`, validate latitude from `-90` through `90` and longitude from `-180` through `180`, and require both or neither. Convert Prisma Decimal values to JavaScript numbers in `ManagedLocation`. Add coordinates for the representative storefronts and E2E locations so nearby sorting can be exercised deterministically.

- [ ] **Step 4: Add coordinate fields to authorized location forms**

Add optional numeric Latitude and Longitude controls with decimal input modes and help text explaining that they power nearby search. Parse blank values as `null`; when a complete pair is saved, set `coordinateSource` to `MANUAL`.

- [ ] **Step 5: Run focused tests and Prisma checks**

Run: `npm run prisma:generate && npx prisma validate && npm test -- tests/locations/schema.test.ts tests/locations/management.test.ts tests/locations/repository.test.ts tests/locations/actions.test.ts tests/ui/location-management.test.tsx && npm run typecheck`

Expected: PASS; Prisma schema validates and generated types compile.

- [ ] **Step 6: Commit the coordinate slice**

```bash
git add prisma modules/locations app/business/locations components/business scripts/seed-phase2-e2e.ts tests/locations tests/ui/location-management.test.tsx
git commit -m "feat: add managed location coordinates"
```

---

### Task 3: Distance-Ranked Marketplace Search

**Files:**
- Create: `modules/marketplace/distance.ts`
- Create: `tests/marketplace/distance.test.ts`
- Modify: `modules/catalog/repository.ts`
- Modify: `modules/marketplace/search.ts`
- Modify: `components/marketplace/StorefrontCard.tsx`
- Modify: `app/search/page.tsx`
- Test: `tests/marketplace/search.test.ts`

**Interfaces:**
- Consumes: Location coordinates from Task 2 and existing published-offering rows.
- Produces: `parseSearchCoordinates(input): Coordinates | null`, `distanceKm(origin, target): number`, optional `distanceKm` on `MarketplaceResult`, and `searchMarketplace({ latitude?, longitude?, ...filters })`.

- [ ] **Step 1: Write failing distance and search-order tests**

```ts
it('ranks each storefront by its nearest valid location', async () => {
  const results = await searchMarketplace(
    { latitude: '14.0101', longitude: '-60.9875' },
    { list: async () => [farBusinessWithTwoLocations, nearBusiness] },
  )
  expect(results.map((result) => result.businessSlug)).toEqual(['near', 'far'])
  expect(results[0]?.distanceKm).toBeGreaterThanOrEqual(0)
})

it.each([
  [{ latitude: 'NaN', longitude: '-60.9' }],
  [{ latitude: '91', longitude: '-60.9' }],
  [{ latitude: '14', longitude: undefined }],
])('ignores invalid coordinate input and keeps deterministic manual ordering', async (input) => {
  const results = await searchMarketplace(input, repository)
  expect(results.map((result) => result.businessSlug)).toEqual(['alpha', 'beta'])
})
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/marketplace/distance.test.ts tests/marketplace/search.test.ts`

Expected: FAIL because coordinate parsing, distance calculation, and distance ordering do not exist.

- [ ] **Step 3: Implement pure coordinate parsing and Haversine distance**

```ts
export type Coordinates = { latitude: number; longitude: number }

export function parseSearchCoordinates(input: { latitude?: string; longitude?: string }): Coordinates | null {
  if (input.latitude === undefined || input.longitude === undefined) return null
  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return { latitude, longitude }
}
```

Implement the Haversine formula using an Earth radius of `6371.0088` kilometres.

- [ ] **Step 4: Thread coordinates through repository rows and sort storefronts**

Select active service-location latitude and longitude values. Compute the minimum valid distance per grouped storefront. When coordinates are valid, sort by distance, then business name, then business slug. Without valid coordinates, keep featured-image priority followed by business name and slug. Render a rounded distance such as `2.4 km away` only when it exists.

- [ ] **Step 5: Run focused tests and static checks**

Run: `npm test -- tests/marketplace/distance.test.ts tests/marketplace/search.test.ts && npm run typecheck`

Expected: PASS with deterministic search results.

- [ ] **Step 6: Commit the distance-search slice**

```bash
git add modules/marketplace modules/catalog/repository.ts components/marketplace/StorefrontCard.tsx app/search/page.tsx tests/marketplace
git commit -m "feat: rank marketplace businesses by distance"
```

---

### Task 4: Permission-Aware Device Location Search UI

**Files:**
- Create: `components/marketplace/NearbySearchControl.tsx`
- Create: `tests/ui/nearby-search-control.test.tsx`
- Modify: `components/marketplace/SearchFilters.tsx`
- Modify: `app/search/page.tsx`
- Modify: `e2e/marketplace-booking.spec.ts`
- Test: `tests/ui/search-filters.test.tsx`

**Interfaces:**
- Consumes: `latitude` and `longitude` search parameters from Task 3.
- Produces: An explicit **Use my location** action that navigates to `/search` with existing manual filters plus validated browser coordinates.

- [ ] **Step 1: Write failing UI tests for success and every browser failure state**

```tsx
it('requests location only after activation and preserves manual filters', async () => {
  const getCurrentPosition = vi.fn((success) => success({ coords: { latitude: 14.0101, longitude: -60.9875 } }))
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  render(<NearbySearchControl values={{ q: 'massage', category: 'Wellness', district: 'Castries' }} navigate={navigate} />)
  expect(getCurrentPosition).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /use my location/i }))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.stringContaining('latitude=14.0101')))
  expect(navigate).toHaveBeenCalledWith(expect.stringContaining('q=massage'))
})

it.each([
  [1, 'Location permission was denied'],
  [2, 'Your location is currently unavailable'],
  [3, 'Finding your location timed out'],
])('keeps manual search available for geolocation error %s', async (code, message) => {
  // Stub getCurrentPosition to invoke its error callback with the supplied code.
  // Assert the message is announced with role=status and the Search button remains enabled.
})
```

Add a separate unsupported-browser test where `navigator.geolocation` is absent.

- [ ] **Step 2: Run focused UI tests and verify failure**

Run: `npm test -- tests/ui/nearby-search-control.test.tsx tests/ui/search-filters.test.tsx`

Expected: FAIL because the device-location control does not exist.

- [ ] **Step 3: Implement the client control without automatic permission prompts**

Use `navigator.geolocation.getCurrentPosition` only inside the button click handler with `{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }`. Build the next URL with `URLSearchParams`, preserve `q`, `category`, and `district`, add coordinates on success, expose a busy label, and announce concise denial, unavailable, timeout, and unsupported messages. Do not log the coordinates.

- [ ] **Step 4: Integrate the control and show active nearby state**

Render the control beside the manual filters. When valid coordinates are in the URL, show “Showing businesses nearest to you” and a “Clear location” link that removes only `latitude` and `longitude`. Update the Search page parameter type and pass all values explicitly.

- [ ] **Step 5: Add browser coverage**

Extend `e2e/marketplace-booking.spec.ts` to grant a fixed browser location, click **Use my location**, assert coordinate query parameters appear, and assert the nearest-distance label renders. Add a denied-permission case proving manual Search remains usable.

- [ ] **Step 6: Run slice verification**

Run: `npm test -- tests/brand/presentation.test.ts tests/locations tests/marketplace tests/ui/marketplace-hero.test.tsx tests/ui/search-filters.test.tsx tests/ui/nearby-search-control.test.tsx tests/ui/location-management.test.tsx && npm run typecheck && npm run build`

Expected: Unit/UI tests, type checking, Prisma generation during build, and the production build all pass.

Run when a seeded E2E database is available: `npx playwright test e2e/marketplace-booking.spec.ts`

Expected: Nearby success and denied-permission journeys pass without affecting the existing booking journey.

- [ ] **Step 7: Commit the device-location UI slice**

```bash
git add components/marketplace app/search/page.tsx tests/ui e2e/marketplace-booking.spec.ts
git commit -m "feat: add nearby business discovery"
```

---

## Plan Completion Gate

After all four tasks:

1. Run `git diff --check`.
2. Run `npm test`.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Run `npx prisma validate`.
6. Review the branch for accidental renames of compatibility-sensitive `booktrix` identifiers.
7. Record any E2E test that could not run because a disposable database or browser permission fixture was unavailable.

The slice is complete only when the visible app consistently says Booktrx, manual discovery remains functional, device permission is never requested automatically, valid coordinates rank storefronts by their nearest location, and invalid or denied location data fails safely.
