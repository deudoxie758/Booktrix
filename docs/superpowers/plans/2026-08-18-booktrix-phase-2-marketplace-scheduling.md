# Booktrix Phase 2 Marketplace and Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive marketplace-to-booking vertical slice with transactional availability, multi-service orders, customer self-service, and manager operations.

**Architecture:** Focused `catalog`, `scheduling`, and `bookings` server modules own all business rules and are consumed by Next.js pages and server actions. Prisma persists additive, business- and location-scoped records in MySQL; transactional holds and idempotent order creation prevent overbooking.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.6, Prisma 6, MySQL, Tailwind CSS 3, Zod, Vitest, Testing Library, Playwright, FullCalendar.

**Spec:** `docs/superpowers/specs/2026-08-18-booktrix-phase-2-marketplace-scheduling-design.md`

## Global Constraints

- Preserve multi-business and multi-location tenancy and Phase 1 contextual authorization.
- Expose marketplace records only for businesses in `PUBLISHED` status and active locations and offerings.
- Store money as integer cents with explicit `XCD` currency.
- Support single- and multi-service orders, professional choice or “any available,” configurable capacity, and automatic or manual confirmation.
- Support full online payment, fixed or percentage deposit, and cash choices without importing Stripe or implementing live WiPay.
- Use database transactions and idempotency to prevent capacity overbooking and duplicate orders.
- Managers operate only assigned locations; overrides require permission, reason, and audit evidence.
- Keep migrations additive and preserve legacy storefront, service, employee, and booking data.
- Maintain the Booktrix nude, cream, cocoa, and clay visual system and intentional 320px mobile layouts.

---

### Task 1: Add the Phase 2 Persistence Model and Legacy Mapping

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260818150000_marketplace_scheduling/migration.sql`
- Create: `modules/bookings/legacy-backfill.ts`
- Create: `scripts/backfill-marketplace-scheduling.ts`
- Create: `tests/migrations/marketplace-scheduling-backfill.test.ts`

**Interfaces:**
- Consumes: Phase 1 `Business`, `Location`, `BusinessMembership`, `LocationAssignment`, and legacy `Spa`, `Service`, `Subservice`, `Employee`, and `Booking` records.
- Produces: additive catalog, schedule, hold, order, segment, and override tables plus `planMarketplaceSchedulingBackfill(input): MarketplaceSchedulingBackfillPlan`.

- [ ] **Step 1: Write the failing schema and backfill tests**

```ts
it('maps one legacy subservice and booking without losing identifiers', () => {
  const plan = planMarketplaceSchedulingBackfill({
    businesses: [{ id: 'biz-1', legacySpaId: 'spa-1' }],
    locations: [{ id: 'loc-1', businessId: 'biz-1' }],
    subservices: [{ id: 'sub-1', spaId: 'spa-1', name: 'Massage', durationMin: 60, priceCents: 12000 }],
    bookings: [{ id: 'old-1', spaId: 'spa-1', subserviceId: 'sub-1' }],
  })
  expect(plan.offerings[0]).toMatchObject({ businessId: 'biz-1', legacySubserviceId: 'sub-1' })
  expect(plan.orders[0]).toMatchObject({ legacyBookingId: 'old-1' })
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- tests/migrations/marketplace-scheduling-backfill.test.ts`
Expected: FAIL because `planMarketplaceSchedulingBackfill` and the Phase 2 schema do not exist.

- [ ] **Step 3: Extend Prisma with explicit enums and relations**

Add `ServiceOffering`, `ServiceLocation`, `StaffQualification`, `LocationHours`, `StaffSchedule`, `StaffTimeOff`, `SchedulingLock`, `BookingHold`, `BookingHoldSegment`, `BookingOrder`, `BookingSegment`, and `BookingOverride`. Define `ConfirmationMode`, `PaymentChoice`, `DepositKind`, `BookingOrderStatus`, `BookingSegmentStatus`, and `BookingOrigin`. Add unique legacy identifier columns and indexes for marketplace filters, staff time ranges, active holds, order ownership, and location calendars.

- [ ] **Step 4: Write the additive SQL migration**

Create enums as MySQL enum columns, tables with foreign keys to Phase 1 records, and indexes matching the Prisma schema. Do not drop or rename any legacy table or column.

- [ ] **Step 5: Implement dry-run and apply backfill paths**

`planMarketplaceSchedulingBackfill` deterministically maps every legacy subservice to one offering at the business's primary location and every legacy booking to one order and segment. The script accepts exactly `--dry-run` or `--apply`, uses upserts keyed by legacy IDs, prints counts, and wraps apply operations in a transaction.

- [ ] **Step 6: Validate the schema and focused tests**

Run: `npx prisma validate && npx prisma generate && npm test -- tests/migrations/marketplace-scheduling-backfill.test.ts`
Expected: schema valid, client generated, and migration tests pass.

- [ ] **Step 7: Commit**

```bash
git add prisma modules/bookings/legacy-backfill.ts scripts/backfill-marketplace-scheduling.ts tests/migrations/marketplace-scheduling-backfill.test.ts
git commit -m "feat: add marketplace scheduling data model"
```

### Task 2: Implement Catalog Pricing, Payment, and Qualification Contracts

**Files:**
- Create: `modules/catalog/types.ts`
- Create: `modules/catalog/pricing.ts`
- Create: `modules/catalog/payment-options.ts`
- Create: `modules/catalog/qualifications.ts`
- Create: `modules/catalog/repository.ts`
- Create: `tests/catalog/pricing.test.ts`
- Create: `tests/catalog/payment-options.test.ts`
- Create: `tests/catalog/qualifications.test.ts`

**Interfaces:**
- Consumes: `ServiceOffering`, `ServiceLocation`, `StaffQualification`, and Phase 1 location assignments.
- Produces: `calculateOfferingPrice(input): PriceBreakdown`, `getAllowedPaymentChoices(offerings): PaymentChoice[]`, `calculatePaymentAmounts(input): PaymentAmounts`, and `isStaffEligible(input): boolean`.

- [ ] **Step 1: Write failing catalog contract tests**

```ts
it('calculates a percentage deposit in integer cents', () => {
  expect(calculatePaymentAmounts({ subtotalCents: 12500, choice: 'DEPOSIT', depositKind: 'PERCENTAGE', depositValue: 30 }))
    .toEqual({ dueOnlineCents: 3750, dueAtAppointmentCents: 8750 })
})

it('intersects payment choices across a multi-service order', () => {
  expect(getAllowedPaymentChoices([{ paymentChoices: ['FULL', 'CASH'] }, { paymentChoices: ['CASH'] }]))
    .toEqual(['CASH'])
})
```

- [ ] **Step 2: Confirm the tests fail for missing contracts**

Run: `npm test -- tests/catalog`
Expected: FAIL with unresolved catalog modules.

- [ ] **Step 3: Implement catalog types and pure rules**

Use discriminated inputs for fixed and percentage deposits, reject negative amounts and attendee counts above capacity, round percentage deposits to the nearest cent, and preserve deterministic payment-choice ordering `FULL`, `DEPOSIT`, `CASH`.

- [ ] **Step 4: Implement repository and staff eligibility**

`listPublishedOfferings(filters)` must join only published businesses, active locations, active service locations, and active offerings. `isStaffEligible` requires an active membership, matching location assignment, and matching service qualification.

- [ ] **Step 5: Run catalog tests and type checking**

Run: `npm test -- tests/catalog && npm run typecheck`
Expected: all catalog tests and TypeScript checks pass.

- [ ] **Step 6: Commit**

```bash
git add modules/catalog tests/catalog
git commit -m "feat: add catalog booking contracts"
```

### Task 3: Build Deterministic Availability Calculation

**Files:**
- Create: `modules/scheduling/types.ts`
- Create: `modules/scheduling/intervals.ts`
- Create: `modules/scheduling/availability.ts`
- Create: `modules/scheduling/repository.ts`
- Create: `tests/scheduling/intervals.test.ts`
- Create: `tests/scheduling/availability.test.ts`

**Interfaces:**
- Consumes: `AvailabilityRequest`, location hours, staff schedules, time off, qualifications, active segments, active holds, duration, buffers, and capacity.
- Produces: `findAvailableStarts(input: AvailabilityInput): AvailableStart[]` and `buildServiceSequence(input): ProposedSegment[]`.

- [ ] **Step 1: Write failing slot-generation tests**

```ts
it('excludes buffers, time off, existing segments, and expired-location hours', () => {
  const starts = findAvailableStarts(fixture({ durationMinutes: 60, preparationMinutes: 15, cleanupMinutes: 15 }))
  expect(starts.map(slot => slot.start.toISOString())).toEqual(['2026-08-20T14:15:00.000Z'])
})

it('returns a contiguous sequence for two services', () => {
  expect(buildServiceSequence(sequenceFixture())).toHaveLength(2)
})
```

- [ ] **Step 2: Confirm availability tests fail**

Run: `npm test -- tests/scheduling/availability.test.ts tests/scheduling/intervals.test.ts`
Expected: FAIL because scheduling functions do not exist.

- [ ] **Step 3: Implement interval primitives**

Create half-open interval overlap, containment, merge, and subtraction helpers. Treat preparation and cleanup as staff-occupied time while returning the customer-visible service start and end separately.

- [ ] **Step 4: Implement availability orchestration**

Generate starts in 15-minute increments in `America/St_Lucia`, require the entire service sequence to fit location and professional schedules, subtract time off and occupied intervals, enforce attendee capacity, and return eligible professionals in stable membership-ID order.

- [ ] **Step 5: Run focused and regression tests**

Run: `npm test -- tests/scheduling tests/catalog`
Expected: scheduling and catalog suites pass.

- [ ] **Step 6: Commit**

```bash
git add modules/scheduling tests/scheduling
git commit -m "feat: calculate Booktrix availability"
```

### Task 4: Add Transactional Holds and Any-Available Assignment

**Files:**
- Create: `modules/scheduling/holds.ts`
- Create: `modules/scheduling/locking.ts`
- Replace: `app/api/availability/route.ts`
- Create: `app/api/booking-holds/route.ts`
- Create: `tests/scheduling/holds.test.ts`
- Create: `tests/api/booking-holds.test.ts`

**Interfaces:**
- Consumes: `findAvailableStarts`, Prisma transaction client, authenticated or anonymous checkout identity, requested segments, and idempotency key.
- Produces: `createBookingHold(input): Promise<BookingHoldResult>`, `getActiveHold(token): Promise<ActiveHold>`, and `expireHold(token): Promise<void>`.

- [ ] **Step 1: Write failing hold and route tests**

```ts
it('returns the same hold for a repeated idempotency key', async () => {
  const first = await createBookingHold(holdInput({ idempotencyKey: 'checkout-1' }))
  const second = await createBookingHold(holdInput({ idempotencyKey: 'checkout-1' }))
  expect(second.token).toBe(first.token)
})

it('allows only one simultaneous hold at capacity one', async () => {
  const results = await Promise.allSettled([createBookingHold(holdInput()), createBookingHold(holdInput())])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
})
```

- [ ] **Step 2: Confirm hold tests fail**

Run: `npm test -- tests/scheduling/holds.test.ts tests/api/booking-holds.test.ts`
Expected: FAIL because hold services and route do not exist.

- [ ] **Step 3: Implement lock keys and transactional hold creation**

Create stable lock keys from business, location, professional or capacity pool, and 15-minute buckets. Upsert and lock `SchedulingLock` rows in sorted order, re-read conflicts inside the transaction, assign “any available” using stable eligible-professional ordering, and create all hold segments atomically with a 10-minute expiry.

- [ ] **Step 4: Implement validated HTTP contracts**

`GET /api/availability` validates business, location, offerings, date, attendee counts, and optional staff IDs. `POST /api/booking-holds` validates the same selection plus idempotency and returns `201`, `409 SLOT_UNAVAILABLE`, or `422 INVALID_SELECTION` without exposing internal errors.

- [ ] **Step 5: Run focused tests and type checking**

Run: `npm test -- tests/scheduling/holds.test.ts tests/api/booking-holds.test.ts && npm run typecheck`
Expected: hold concurrency, expiry, idempotency, and route tests pass.

- [ ] **Step 6: Commit**

```bash
git add modules/scheduling app/api/availability/route.ts app/api/booking-holds tests/scheduling/holds.test.ts tests/api/booking-holds.test.ts
git commit -m "feat: reserve booking capacity with holds"
```

### Task 5: Implement Booking Orders and State Transitions

**Files:**
- Create: `modules/bookings/types.ts`
- Create: `modules/bookings/transitions.ts`
- Create: `modules/bookings/orders.ts`
- Create: `modules/bookings/policies.ts`
- Create: `modules/bookings/repository.ts`
- Create: `modules/notifications/booking-events.ts`
- Replace: `app/api/bookings/route.ts`
- Create: `tests/bookings/transitions.test.ts`
- Create: `tests/bookings/orders.test.ts`
- Create: `tests/api/bookings.test.ts`

**Interfaces:**
- Consumes: active hold token, authenticated customer, payment choice, catalog pricing contracts, and provider-neutral payment registry.
- Produces: `createBookingOrder(input): Promise<BookingOrderView>`, `transitionSegment(input): Promise<BookingSegmentView>`, `cancelCustomerOrder(input)`, `rescheduleCustomerOrder(input)`, and `createBookingNotificationRequest(event)`.

- [ ] **Step 1: Write failing lifecycle and atomic-order tests**

```ts
it('creates confirmed and requested segments from mixed confirmation modes', async () => {
  const order = await createBookingOrder(orderInput({ confirmationModes: ['AUTOMATIC', 'MANUAL'] }))
  expect(order.segments.map(segment => segment.status)).toEqual(['CONFIRMED', 'REQUESTED'])
})

it('rejects an invalid completed-to-confirmed transition', () => {
  expect(() => assertSegmentTransition('COMPLETED', 'CONFIRMED')).toThrow('INVALID_BOOKING_TRANSITION')
})
```

- [ ] **Step 2: Confirm booking tests fail**

Run: `npm test -- tests/bookings tests/api/bookings.test.ts`
Expected: FAIL because order and transition contracts are missing.

- [ ] **Step 3: Implement state machines and customer policies**

Encode allowed order and segment transitions as explicit maps. Cancellation checks ownership, lead-time policy, terminal state, and reason. Rescheduling creates a replacement hold first and swaps schedule values in one transaction before releasing the prior reservation.

- [ ] **Step 4: Implement idempotent hold consumption**

Lock and validate the hold, customer identity, business state, prices, payment choice, and capacity. Create the order and all segments atomically, mark the hold consumed, and return the existing order for a repeated idempotency key. For `FULL` or `DEPOSIT`, create only a provider-neutral pending payment record; for `CASH`, record the full amount due at appointment.

- [ ] **Step 5: Emit provider-independent notification requests**

Map booking creation, request, confirmation, cancellation, and rescheduling events to serializable notification requests. Persist requests after the booking transaction succeeds; do not send email inline or let delivery failure roll back a valid booking.

- [ ] **Step 6: Replace the legacy bookings route with the new contract**

Support authenticated customer `GET` and `POST`. Preserve a documented legacy adapter for old single-booking payloads by translating them to one requested offering; do not authorize through `User.role`.

- [ ] **Step 7: Run booking, payment, and authorization tests**

Run: `npm test -- tests/bookings tests/api/bookings.test.ts tests/payments tests/organizations/access.test.ts && npm run typecheck`
Expected: all suites and TypeScript checks pass.

- [ ] **Step 8: Commit**

```bash
git add modules/bookings modules/notifications app/api/bookings/route.ts tests/bookings tests/api/bookings.test.ts
git commit -m "feat: create transactional booking orders"
```

### Task 6: Build Marketplace Search and Storefront Pages

**Files:**
- Create: `modules/marketplace/search.ts`
- Create: `modules/marketplace/storefront.ts`
- Modify: `app/page.tsx`
- Modify: `app/search/page.tsx`
- Modify: `app/s/[slug]/page.tsx`
- Create: `components/marketplace/SearchFilters.tsx`
- Create: `components/marketplace/StorefrontCard.tsx`
- Create: `components/marketplace/ServicePicker.tsx`
- Create: `tests/marketplace/search.test.ts`
- Create: `tests/ui/search-filters.test.tsx`
- Create: `tests/ui/service-picker.test.tsx`

**Interfaces:**
- Consumes: `listPublishedOfferings(filters)` and storefront slug.
- Produces: `searchMarketplace(input): Promise<MarketplaceResult[]>`, `getPublishedStorefront(slug)`, accessible search/filter UI, and selected service IDs serialized into booking navigation.

- [ ] **Step 1: Write failing publication and UI tests**

```ts
it('excludes suspended and unpublished businesses', async () => {
  const results = await searchMarketplace({ query: 'massage', district: 'Castries' })
  expect(results.every(result => result.businessStatus === 'PUBLISHED')).toBe(true)
})

it('announces the number of selected services', async () => {
  render(<ServicePicker offerings={offerings} />)
  await user.click(screen.getByRole('checkbox', { name: /deep tissue/i }))
  expect(screen.getByRole('status')).toHaveTextContent('1 service selected')
})
```

- [ ] **Step 2: Confirm marketplace tests fail**

Run: `npm test -- tests/marketplace tests/ui/search-filters.test.tsx tests/ui/service-picker.test.tsx`
Expected: FAIL for missing marketplace modules and components.

- [ ] **Step 3: Implement server marketplace queries**

Normalize text search, category, district, location, price range, and pagination. Query only active offerings attached to active locations of published businesses; return starting price, duration, location names, and representative image data without leaking private membership data.

- [ ] **Step 4: Build responsive discovery and storefront interfaces**

Use server-rendered results with URL search parameters, a mobile filter disclosure, semantic result counts, Booktrix cards, empty states, and service selection. The storefront displays locations, offerings, policies, qualified professionals, and a sticky mobile “Book selected services” action.

- [ ] **Step 5: Run UI tests, type checking, and route build**

Run: `npm test -- tests/marketplace tests/ui/search-filters.test.tsx tests/ui/service-picker.test.tsx && npm run typecheck && npm run build`
Expected: tests, types, and production build pass.

- [ ] **Step 6: Commit**

```bash
git add modules/marketplace app/page.tsx app/search/page.tsx app/s components/marketplace tests/marketplace tests/ui
git commit -m "feat: add Booktrix marketplace discovery"
```

### Task 7: Build the Held Customer Checkout

**Files:**
- Create: `app/book/[businessSlug]/page.tsx`
- Create: `app/book/[businessSlug]/actions.ts`
- Create: `app/book/[businessSlug]/BookingFlow.tsx`
- Create: `components/booking/BookingStepper.tsx`
- Create: `components/booking/AvailabilityPicker.tsx`
- Create: `components/booking/BookingSummary.tsx`
- Create: `components/booking/PaymentChoice.tsx`
- Create: `modules/bookings/checkout-session.ts`
- Create: `tests/ui/booking-flow.test.tsx`
- Create: `tests/bookings/checkout-session.test.ts`

**Interfaces:**
- Consumes: selected offering IDs, marketplace storefront, availability and hold APIs, authenticated session, allowed payment choices, and `createBookingOrder`.
- Produces: resumable `Services → Location and professional → Date and time → Customer details → Payment choice → Review` checkout and `returnToCheckoutUrl(holdToken)`.

- [ ] **Step 1: Write failing checkout state and accessibility tests**

```ts
it('returns authentication to the held review step', () => {
  expect(returnToCheckoutUrl('hold-token')).toBe('/book/checkout?hold=hold-token')
})

it('moves focus to an expired-hold alert', async () => {
  render(<BookingFlow initialState={expiredHoldState} />)
  expect(await screen.findByRole('alert')).toHaveFocus()
})
```

- [ ] **Step 2: Confirm checkout tests fail**

Run: `npm test -- tests/ui/booking-flow.test.tsx tests/bookings/checkout-session.test.ts`
Expected: FAIL for missing checkout modules and components.

- [ ] **Step 3: Implement checkout state and server actions**

Parse and validate every step on the server, preserve selections in URL-safe signed state until hold creation, store the opaque hold token after selection, redirect unauthenticated users to sign-in with a same-origin return URL, and submit the final idempotent order action.

- [ ] **Step 4: Build responsive stepper components**

Use labeled step navigation, keyboard-operable date/time choices, live selection summaries, explicit payment amounts, focused validation errors, an expiry countdown that respects reduced motion, and a sticky mobile summary/action area.

- [ ] **Step 5: Run checkout and regression checks**

Run: `npm test -- tests/ui/booking-flow.test.tsx tests/bookings/checkout-session.test.ts tests/scheduling tests/bookings && npm run typecheck`
Expected: checkout, scheduling, booking, and type checks pass.

- [ ] **Step 6: Commit**

```bash
git add app/book components/booking modules/bookings/checkout-session.ts tests/ui/booking-flow.test.tsx tests/bookings/checkout-session.test.ts
git commit -m "feat: add held customer booking checkout"
```

### Task 8: Add Customer Booking Self-Service

**Files:**
- Create: `app/profile/bookings/page.tsx`
- Create: `app/profile/bookings/[orderId]/page.tsx`
- Create: `app/profile/bookings/actions.ts`
- Create: `components/booking/BookingStatus.tsx`
- Create: `components/booking/CustomerBookingCard.tsx`
- Modify: `app/profile/page.tsx`
- Create: `tests/bookings/customer-access.test.ts`
- Create: `tests/ui/customer-booking-card.test.tsx`

**Interfaces:**
- Consumes: authenticated customer ID, `BookingOrderView`, cancellation policy, and replacement hold for rescheduling.
- Produces: customer-owned upcoming/history lists, detail view, `cancelBookingAction`, and `rescheduleBookingAction`.

- [ ] **Step 1: Write failing ownership and status-display tests**

```ts
it('denies a different customer order identifier', async () => {
  await expect(getCustomerOrder({ orderId: 'order-2', customerId: 'customer-1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

it('labels a mixed order as partially awaiting approval', () => {
  render(<BookingStatus segments={[confirmedSegment, requestedSegment]} />)
  expect(screen.getByText(/partially awaiting approval/i)).toBeVisible()
})
```

- [ ] **Step 2: Confirm customer booking tests fail**

Run: `npm test -- tests/bookings/customer-access.test.ts tests/ui/customer-booking-card.test.tsx`
Expected: FAIL for missing customer booking interfaces.

- [ ] **Step 3: Implement customer-owned queries and actions**

Always filter orders by authenticated customer ID in the query itself. Group upcoming and historical orders, expose allowed actions from policy results, require a reason where configured, and revalidate profile booking paths after a successful mutation.

- [ ] **Step 4: Build responsive booking cards and details**

Show storefront, location, segment sequence, professionals, attendee counts, approval and payment states, amounts due, and accessible cancellation/rescheduling dialogs. Never render manager-only notes or walk-in records.

- [ ] **Step 5: Run focused tests and production build**

Run: `npm test -- tests/bookings/customer-access.test.ts tests/ui/customer-booking-card.test.tsx && npm run typecheck && npm run build`
Expected: ownership, UI, type, and build checks pass.

- [ ] **Step 6: Commit**

```bash
git add app/profile components/booking modules/bookings tests/bookings/customer-access.test.ts tests/ui/customer-booking-card.test.tsx
git commit -m "feat: add customer booking self-service"
```

### Task 9: Add Manager Agenda, Calendar, and Booking Operations

**Files:**
- Replace: `app/business/calendar/page.tsx`
- Modify: `app/manager/calendar.tsx`
- Modify: `app/manager/calendar-view.tsx`
- Create: `app/business/calendar/actions.ts`
- Create: `components/business/BookingAgenda.tsx`
- Create: `components/business/BookingEditor.tsx`
- Create: `components/business/WalkInCustomerFields.tsx`
- Create: `modules/bookings/management.ts`
- Create: `modules/bookings/overrides.ts`
- Create: `tests/bookings/management.test.ts`
- Create: `tests/bookings/overrides.test.ts`
- Create: `tests/ui/booking-agenda.test.tsx`

**Interfaces:**
- Consumes: `requireLocationAccess`, assigned location IDs, booking transition contracts, availability, registered customer ID or walk-in details, and Phase 1 audit creation.
- Produces: `listManagedSegments(input)`, `createManagedBooking(input)`, `manageBookingSegment(input)`, and `recordSchedulingOverride(input)`.

- [ ] **Step 1: Write failing location-access and override tests**

```ts
it('rejects a manager operating an unassigned location', async () => {
  await expect(createManagedBooking(managerInput({ locationId: 'other-location' }))).rejects.toMatchObject({ code: 'FORBIDDEN' })
})

it('requires a reason and creates an immutable override audit', async () => {
  await expect(recordSchedulingOverride(overrideInput({ reason: '' }))).rejects.toThrow('OVERRIDE_REASON_REQUIRED')
})
```

- [ ] **Step 2: Confirm manager tests fail**

Run: `npm test -- tests/bookings/management.test.ts tests/bookings/overrides.test.ts tests/ui/booking-agenda.test.tsx`
Expected: FAIL for missing management interfaces.

- [ ] **Step 3: Implement scoped operations and override auditing**

Resolve business context and authorized locations before every query. Manager-created bookings use normal holds unless an authorized owner or manager explicitly selects override and supplies a reason. Persist actor, booking, location, prior values, resulting values, reason, and timestamp in both `BookingOverride` and the general audit stream.

- [ ] **Step 4: Build agenda-first and calendar interfaces**

Render a mobile agenda by default and FullCalendar day/week views at larger breakpoints. Add location, staff, service, and status filters; accessible dialogs for approve, reject, reschedule, cancel, check-in, start, complete, and no-show; and a booking editor supporting registered customers or explicit walk-in contact fields.

- [ ] **Step 5: Run manager and authorization checks**

Run: `npm test -- tests/bookings/management.test.ts tests/bookings/overrides.test.ts tests/ui/booking-agenda.test.tsx tests/organizations/access.test.ts && npm run typecheck`
Expected: manager, audit, authorization, UI, and type checks pass.

- [ ] **Step 6: Commit**

```bash
git add app/business/calendar app/manager/calendar.tsx app/manager/calendar-view.tsx components/business modules/bookings tests/bookings tests/ui/booking-agenda.test.tsx
git commit -m "feat: add manager booking operations"
```

### Task 10: Add Business Catalog and Schedule Management

**Files:**
- Replace: `app/business/services/page.tsx`
- Replace: `app/business/schedule/page.tsx`
- Create: `app/business/services/actions.ts`
- Create: `app/business/schedule/actions.ts`
- Create: `components/business/ServiceEditor.tsx`
- Create: `components/business/StaffScheduleEditor.tsx`
- Create: `components/business/TimeOffEditor.tsx`
- Create: `modules/catalog/management.ts`
- Create: `modules/scheduling/management.ts`
- Create: `tests/catalog/management.test.ts`
- Create: `tests/scheduling/management.test.ts`
- Create: `tests/ui/service-editor.test.tsx`

**Interfaces:**
- Consumes: owner or manager business access, assigned locations, catalog validation, and scheduling interval validation.
- Produces: `saveOffering(input)`, `assignQualification(input)`, `saveLocationHours(input)`, `saveStaffSchedule(input)`, and `saveTimeOff(input)`.

- [ ] **Step 1: Write failing permission and validation tests**

```ts
it('rejects capacity below one and a percentage deposit above one hundred', async () => {
  await expect(saveOffering(offeringInput({ capacity: 0, depositValue: 125 }))).rejects.toMatchObject({ code: 'INVALID_OFFERING' })
})

it('rejects overlapping schedule intervals', async () => {
  await expect(saveStaffSchedule(scheduleInput({ intervals: [['09:00', '13:00'], ['12:00', '16:00']] }))).rejects.toThrow('OVERLAPPING_SCHEDULE')
})
```

- [ ] **Step 2: Confirm management tests fail**

Run: `npm test -- tests/catalog/management.test.ts tests/scheduling/management.test.ts tests/ui/service-editor.test.tsx`
Expected: FAIL for missing management services and components.

- [ ] **Step 3: Implement scoped catalog and schedule mutations**

Validate names, durations, buffers, cents, capacity, deposit rules, payment choices, confirmation mode, assigned locations, qualifications, weekday intervals, and dated time off. Owners can manage all business locations; managers can modify only assigned locations and cannot grant qualifications outside them.

- [ ] **Step 4: Build service and schedule workspaces**

Replace placeholders with responsive editors using existing `Field`, `Button`, `Card`, and `StatusBadge` primitives. Provide visible validation, service activation, location availability, professional qualification, weekly hours, time-off entry, and unsaved-change feedback.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test -- tests/catalog/management.test.ts tests/scheduling/management.test.ts tests/ui/service-editor.test.tsx && npm run typecheck && npm run build`
Expected: management, UI, type, and build checks pass.

- [ ] **Step 6: Commit**

```bash
git add app/business/services app/business/schedule components/business modules/catalog/management.ts modules/scheduling/management.ts tests/catalog/management.test.ts tests/scheduling/management.test.ts tests/ui/service-editor.test.tsx
git commit -m "feat: manage services and schedules"
```

### Task 11: Verify End-to-End Booking and Responsive Journeys

**Files:**
- Create: `e2e/marketplace-booking.spec.ts`
- Create: `e2e/manager-bookings.spec.ts`
- Create: `e2e/booking-accessibility.spec.ts`
- Modify: `prisma/seed.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: complete Phase 2 public, customer, and manager routes plus deterministic seed fixtures.
- Produces: reproducible E2E coverage for booking, approval, walk-ins, cancellation, rescheduling, access denial, and 320px layouts.

- [ ] **Step 1: Extend deterministic seed fixtures**

Seed one published multi-location business, two active offerings with different confirmation and payment modes, qualified and unqualified staff, schedules, time off, a customer, an assigned manager, and an accounts user. Use idempotent upserts and documented development credentials.

- [ ] **Step 2: Add marketplace and customer journeys**

Test search, storefront service selection, any-available assignment, authentication return, single and multi-service checkout, cash selection, mixed confirmation state, expired hold recovery, cancellation, and rescheduling.

- [ ] **Step 3: Add manager and negative journeys**

Test assigned-location agenda, manual approval, walk-in creation, allowed transitions, override reason and audit result, forged location denial, accounts-role mutation denial, and suspended-business booking denial.

- [ ] **Step 4: Add responsive and accessibility journeys**

At 320×720, tablet, and desktop sizes, assert no horizontal overflow on search, storefront, checkout, customer bookings, agenda, and calendar. Verify keyboard date/time selection, focus on errors and expired holds, semantic status announcements, and reduced-motion operation.

- [ ] **Step 5: Run browser and regression suites**

Run: `npm test && npm run typecheck && npm run test:e2e`
Expected: all unit/integration tests, TypeScript checks, and Playwright journeys pass; platform-specific unsupported keyboard cases may be explicitly skipped with a written reason.

- [ ] **Step 6: Commit**

```bash
git add e2e prisma/seed.ts playwright.config.ts
git commit -m "test: cover Phase 2 booking journeys"
```

### Task 12: Apply Migration, Verify, and Document Phase 2

**Files:**
- Modify: `README.md`
- Modify: `DEPLOYMENT.md`
- Create: `docs/architecture/phase-2-marketplace-scheduling.md`

**Interfaces:**
- Consumes: all Phase 2 deliverables and the authorized existing MySQL database.
- Produces: applied additive migration, reviewed backfill, reproducible operations documentation, and final acceptance evidence.

- [ ] **Step 1: Validate and deploy the additive migration**

Run: `npx prisma validate && npx prisma migrate status && npx prisma migrate deploy`
Expected: schema valid and `20260818150000_marketplace_scheduling` applied without destructive warnings.

- [ ] **Step 2: Dry-run and apply the legacy backfill**

Run: `npx tsx scripts/backfill-marketplace-scheduling.ts --dry-run`
Expected: counts reconcile with legacy subservices and bookings and no writes occur. Review counts, then run `npx tsx scripts/backfill-marketplace-scheduling.ts --apply`; rerun dry-run and expect zero pending writes.

- [ ] **Step 3: Update setup and deployment documentation**

Document migration and backfill commands, the 10-minute hold lifetime, `America/St_Lucia` scheduling behavior, seed fixtures, payment-recording limitation, manager override audits, verification commands, and rollback-by-forward-migration policy. State clearly that WiPay remains inactive.

- [ ] **Step 4: Run the complete verification gate**

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

Expected: every command exits zero, concurrency tests prove capacity is not exceeded, authorization tests deny cross-tenant access, and no tested 320px route overflows horizontally.

- [ ] **Step 5: Record acceptance evidence**

In `docs/architecture/phase-2-marketplace-scheduling.md`, list delivered journeys, migration/backfill counts, verification results, known provider limitation, and later-phase exclusions from the specification.

- [ ] **Step 6: Commit**

```bash
git add README.md DEPLOYMENT.md docs/architecture/phase-2-marketplace-scheduling.md
git commit -m "docs: complete Booktrix Phase 2 handoff"
```
