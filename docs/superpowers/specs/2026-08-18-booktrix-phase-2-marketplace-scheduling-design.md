# Booktrix Phase 2 Marketplace and Scheduling Design

## Purpose

Phase 2 delivers Booktrix's first complete booking vertical slice. Customers can discover published Saint Lucian service businesses, select one or more services, find valid availability, reserve capacity, and create a booking. Business teams can manage the resulting appointments and create bookings for registered customers or walk-ins.

The phase builds on the tenancy, contextual permissions, business lifecycle, visual system, and provider-neutral payment boundary delivered in Phase 1. It records payment choices and pending online payment intent but does not activate WiPay or financial ledgers.

## Approved Approach

Booktrix will use a domain-first vertical slice. Catalog, scheduling, and booking rules live in focused server modules, and the marketplace, customer flow, and manager tools consume those shared rules. This provides usable end-to-end journeys without duplicating availability or lifecycle decisions in pages and route handlers.

The rejected alternatives were a UI-first build, which would create disposable scheduling logic, and a scheduling-engine-only build, which would delay usable customer and manager outcomes.

## Scope

Phase 2 includes:

- marketplace search by service, category, business, and Saint Lucian location;
- published storefront and service detail pages;
- location hours, staff schedules, time off, service qualifications, buffers, and capacity;
- professional selection or atomic assignment of any eligible professional;
- short-lived checkout holds and transactional capacity revalidation;
- single-service and multi-service booking orders;
- automatic confirmation or manager approval by service;
- full-payment, deposit, and cash choices recorded on the order;
- customer upcoming and historical booking views, cancellation, and rescheduling;
- manager agenda/calendar, booking management, and registered-customer or walk-in creation;
- authorized scheduling overrides with reasons and audit records;
- responsive, accessible public, customer, and manager experiences.

Phase 2 excludes production WiPay processing, commission assessment, subscription billing, refunds, finance ledgers, live email delivery, reviews, and favourites. Those remain later-phase work.

## Domain Architecture

The modular monolith gains three cohesive domains:

- **Catalog** owns services, categories, location offerings, duration, price, capacity, buffers, confirmation mode, payment choices, policies, and staff qualifications.
- **Scheduling** owns location opening hours, recurring staff schedules, dated time off, availability calculation, professional assignment, and expiring capacity holds.
- **Bookings** owns orders, appointment segments, booking state transitions, cancellation and rescheduling rules, payment-choice state, idempotency, and manager overrides.

Pages, server actions, and route handlers call these domain interfaces rather than reproducing their rules. Every record carries an unambiguous business relationship, and location-owned records also carry location scope. Protected operations reuse the Phase 1 contextual authorization helpers.

Marketplace queries expose only published, active businesses and bookable offerings. Suspended, archived, setup-incomplete, or unpublished businesses cannot accept new bookings.

## Catalog Model

A service belongs to one business and can be offered at one or more of its locations. The core service record stores its name, description, category, active state, duration, preparation and cleanup buffers, price in integer XCD cents, customer capacity, confirmation mode, and customer-facing policies.

Location offerings can enable or disable a service and refine location-specific availability without cloning the business service. Allowed payment choices are explicit: full online payment, fixed or percentage deposit, and cash at appointment. A service can expose any valid combination of these choices.

Staff qualifications explicitly associate a business member with the services and locations they can perform. An unqualified or location-unassigned member is never considered by availability, even if their working schedule overlaps the requested time.

## Scheduling and Availability

Availability derives from:

- location opening hours;
- staff recurring working schedules;
- dated time off and schedule exceptions;
- service duration plus preparation and cleanup buffers;
- staff qualifications and location assignments;
- existing non-terminal booking segments;
- active, unexpired holds;
- service customer capacity and requested attendee count.

Customers do not select rooms or equipment in Phase 2. The scheduling interface will accept future resource constraints internally without adding resources to the public booking contract.

Availability results are advisory. Final hold creation and booking confirmation revalidate all affected segments inside database transactions. For “any available,” the server atomically assigns an eligible professional when the hold is created. Deterministic ordering distributes assignments predictably and prevents browser-selected identifiers from bypassing eligibility.

A short-lived hold reserves the complete proposed service sequence during checkout. It records an opaque token, customer or anonymous checkout identity, expiry, requested segments, and idempotency key. Expired holds no longer consume capacity. If any segment becomes unavailable, the hold fails as a whole and the customer selects another time.

## Booking Model

A `BookingOrder` represents one customer checkout. It records the customer when authenticated, optional walk-in contact details for manager-created orders, business, currency, subtotal, selected payment choice, amount due online, amount due at appointment, overall state, and idempotency key.

Each `BookingSegment` records one scheduled service, location, assigned professional, start and end time, attendee count, allocated price, confirmation mode, and status. Multiple segments allow one order to contain a sequence of services while retaining independent operational status.

Orders use a constrained lifecycle such as draft, held, payment-pending, requested, confirmed, completed, partially-cancelled, cancelled, and expired. Segments use requested, confirmed, in-progress, completed, rejected, cancelled, and no-show states. Domain transition functions define valid moves; clients cannot directly set arbitrary states.

Automatic-confirmation services become confirmed after checkout requirements succeed. Manual-confirmation services become requested and appear in the manager queue. A mixed order can therefore contain both confirmed and requested segments while presenting one understandable order summary to the customer.

## Customer Journey

1. A visitor searches or browses published storefronts and services.
2. The visitor chooses a business, location, one or more services, attendee counts, and optionally professionals.
3. The server calculates valid starts for the complete service sequence.
4. The visitor selects a start, and the server creates a short-lived hold for all segments.
5. If unauthenticated, the visitor signs in or registers and returns to the held checkout.
6. The customer chooses full payment, deposit, or cash where the selected services permit it.
7. The customer reviews and confirms the order.
8. The server revalidates and consumes the hold transactionally, creates the order and segments, and applies confirmation modes.
9. Booktrix shows the booking state and emits notification requests through a prepared interface.

Upcoming and past booking pages show service, location, professional, time, attendees, payment choice, balance state, and approval state. Cancellation and rescheduling actions enforce the service policy and rerun availability checks.

## Manager Journey

Managers see only their assigned locations; owners can work across their business. The default mobile experience is an agenda, while larger screens add day and week calendar views. Filters include location, staff member, service, and booking status.

Authorized users can create a booking for an existing customer or enter walk-in contact details. This flow uses the same scheduling and capacity services as public checkout. Managers can approve, reject, reschedule, cancel, check in, start, complete, or mark no-show when the current state and their permissions allow it.

An override can bypass an otherwise unavailable slot only for a role granted override permission. It requires a non-empty reason and creates an immutable audit record containing actor, business, location, affected booking, previous values, resulting values, and timestamp.

## Payment Boundary

Phase 2 calculates and records the chosen payment policy but does not perform live online collection. Full-payment and deposit choices create a provider-neutral pending payment request through the Phase 1 payment contract. Cash creates no online request and records the expected amount due at the appointment.

Booking confirmation distinguishes cash, payment-pending, payment-authorized, and payment-failed paths. A failed required online payment never produces a paid booking. Idempotency keys prevent duplicate orders from repeated form submissions or future provider callbacks.

All amounts are integer cents with explicit `XCD` currency. No Phase 2 domain module imports Stripe or a concrete WiPay adapter.

## Concurrency and Failure Handling

- Hold creation and final booking creation recheck staff conflicts, capacity, qualifications, opening hours, and active holds in transactions.
- Multi-service holds and bookings are all-or-nothing at creation; partial operational changes are allowed only after a valid order exists.
- Expired holds return an actionable response that sends the customer back to time selection with their service choices preserved.
- Duplicate idempotency keys return the original safe result rather than creating duplicate holds or orders.
- Rescheduling reserves the replacement schedule before releasing the original segments.
- Customer-facing errors explain recovery steps without exposing database, authorization, or payment internals.
- Diagnostic detail is logged server-side with correlation identifiers.

MySQL does not provide an exclusion constraint for arbitrary time ranges. The scheduling service therefore serializes conflicting capacity decisions using transactions and lockable scheduling keys scoped to the affected location, professional, service capacity, and time interval. Concurrency tests must prove that simultaneous requests cannot exceed capacity.

## Security and Authorization

Every read and mutation validates the actor, business, location, record ownership, current lifecycle state, and requested transition on the server. Interface visibility is never the authorization boundary.

Customers can access only their own authenticated orders. Walk-in orders are accessible to authorized business users and are not silently attached to an account based only on matching contact information. Managers are limited to assigned locations. Staff see their assigned appointments and only the customer information required to deliver those services. Accounts users do not gain appointment-administration privileges.

Forged business, location, service, staff, hold, and booking identifiers fail closed. New booking creation rejects inactive services and businesses that are not published and active.

## Experience Design

Phase 2 continues the Booktrix Modern Soft and Quiet Luxury system: cream and nude foundations, cocoa text and controls, restrained clay accents, editorial typography, rounded surfaces, generous spacing, and subtle motion.

Marketplace search supports service, category, business name, and Saint Lucian location with mobile-friendly filters. Storefronts present business details, locations, service prices and duration, policies, and eligible professionals.

The booking interface is a focused sequence:

`Services → Location and professional → Date and time → Customer details → Payment choice → Review`

Selected services and totals remain visible in a persistent summary. Mobile layouts use sticky primary actions and touch-friendly controls. Authentication returns the customer to the active held checkout.

Manager mobile layouts prioritize the agenda and immediate actions. Desktop and tablet layouts provide day and week calendars without shrinking desktop tables into narrow screens. Walk-ins, manual approvals, payment state, and overrides have clear visual labels.

Empty, loading, expired-hold, unavailable-slot, validation, permission-denied, and partial-order states receive intentional interfaces. Date and time selection is keyboard operable, validation is announced and focused, targets meet touch sizing expectations, contrast remains accessible, and reduced-motion preferences are honored.

## Testing Strategy

Phase 2 requires:

- unit tests for price and deposit calculation, allowed payment choices, status transitions, policy decisions, and slot generation;
- integration tests against MySQL for concurrent holds, expiry, capacity, professional conflicts, any-available assignment, multi-service atomicity, idempotency, rescheduling, and override audits;
- authorization tests for customer ownership and cross-business or cross-location denial;
- end-to-end journeys for public search, storefront selection, authentication return, single and multi-service booking, cash selection, manual approval, manager-created walk-ins, cancellation, and rescheduling;
- responsive checks at 320px phone, tablet, and desktop widths for marketplace, checkout, customer bookings, agenda, and calendar;
- accessibility checks for keyboard operation, focus management, validation announcements, status semantics, and reduced motion;
- Prisma validation, migration deployment, type checking, linting, unit/integration tests, browser tests, and production build verification.

## Completion Criteria

Phase 2 is complete when:

- visitors can discover only published businesses and bookable services;
- authenticated customers can create single-service and multi-service bookings using valid availability;
- concurrent requests cannot overbook staff or service capacity;
- any-available assignment selects only qualified, location-authorized staff;
- holds expire safely and booking creation is transactional and idempotent;
- automatic and manual confirmation modes behave correctly;
- customers can view and use allowed cancellation and rescheduling actions;
- managers can operate an assigned-location calendar and create registered-customer or walk-in bookings;
- overrides require permission, reason, and audit evidence;
- payment choices are calculated and recorded without concrete provider coupling;
- responsive, accessibility, authorization, migration, type, build, and browser verification passes.
