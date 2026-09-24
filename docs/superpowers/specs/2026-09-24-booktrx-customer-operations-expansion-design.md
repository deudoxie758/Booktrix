# Booktrx Customer and Operations Expansion Design

## Purpose

Booktrx will evolve from a Saint Lucia-specific appointment marketplace into a service-industry booking platform that remains suitable for its initial Saint Lucia launch. Customers will be able to discover nearby businesses and complete a booking without creating an account. Business users will receive the scheduling, intake, booking-detail, privacy, and finance capabilities required to operate the platform safely.

This work also changes the visible product name from **Booktrix** to **Booktrx**.

## Current State

The current application already provides:

- multi-business and multi-location workspaces;
- role-aware Owner, Manager, Staff, and Accounts access;
- staff recurring schedules and time-off exceptions;
- live time-slot availability and booking holds;
- customer and manager-created booking records;
- a booking finance ledger and audited cash reconciliation;
- business settings, storefront publication, and team invitations.

The active customer checkout still requires authentication. Its date field does not disable dates without availability, and its customer-details step does not collect contact or intake information. The revised Manager calendar shows agenda summaries but has no complete booking-details view or intake workflow. The Customers workspace is a placeholder. Staff do not yet have an assigned-booking details workspace. Online payments and provider payouts are not active.

## Scope and Delivery Strategy

The work will be delivered as a phased platform upgrade:

1. visible branding and customer discovery;
2. availability calendar;
3. guest checkout and view-only guest access;
4. configurable intake forms and sensitive-data controls;
5. Owner, Manager, and Staff booking operations;
6. payment-provider settlement and payout reporting;
7. bank-feed importing and automated reconciliation in a later phase.

The payment phase remains disabled until a compatible provider is verified and its sandbox flows pass payment, webhook, refund, idempotency, and payout tests.

## Branding and Market Positioning

All active customer-facing and business-facing presentation will use **Booktrx**. Page metadata, navigation, authentication pages, email copy, notifications, and current documentation will be updated.

Compatibility-sensitive identifiers will not be renamed merely for presentation. Existing database identifiers, migration history, cookie names, environment variable names, seeded test namespaces, and external references can retain `booktrix` where changing them would invalidate sessions, fixtures, integrations, or historical data.

Saint Lucia remains the initial operating market, with XCD and `America/St_Lucia` as the initial supported currency and timezone. Marketing and search labels will use broader language such as “Service-based businesses” and “Location.” Legitimate addresses, timezone rules, and local seed content may still name Saint Lucia.

Legacy customer and management routes will either redirect to their active Booktrx equivalents or be removed from navigation so users cannot enter obsolete flows.

## Customer Discovery and Device Location

Search will offer an explicit **Use my location** action. Booktrx will request browser geolocation only after the customer selects that action. Denial, timeout, unavailable positioning, and unsupported browsers will produce a clear non-blocking message. Manual search remains available at all times.

Business locations will store latitude and longitude. Owners and Managers can set coordinates through location management, initially by entering an address and confirming the resolved location. Search results can be ordered by distance from the customer's coordinates. The first implementation may use MySQL-compatible distance calculation and does not require a separate search service.

Location permission is not persisted beyond what is necessary to perform the current search. Precise customer coordinates will not be attached to a booking, included in analytics, or exposed to businesses.

## Availability Calendar

The existing live availability endpoint remains the final authority for reserving a time. A new range-summary endpoint will return bookable dates for a bounded month or date range.

The customer calendar will disable:

- dates when the location is closed;
- dates on which no qualified staff member is working;
- dates fully blocked by staff time off or existing bookings and holds;
- dates inside the business's minimum-notice window;
- dates beyond the maximum advance-booking window;
- dates incompatible with the selected service sequence and capacity.

Selecting an enabled date loads exact live slots. Reserving a slot still creates a short-lived server-side hold and revalidates availability transactionally, preventing stale calendar results from creating double bookings.

## Optional Authentication and Guest Checkout

Authentication becomes optional for customer booking only. Business, staff, finance, administration, booking-history, cancellation, and rescheduling functions continue to require authentication.

Guest checkout requires:

- full name;
- email address;
- phone number;
- required intake answers;
- sensitive-data consent when applicable;
- a valid payment choice.

Signed-in customers receive prefilled identity information and the resulting booking is associated with their account. Guest bookings store a nullable customer account relationship plus a snapshot of the submitted contact details.

After a guest booking is created, Booktrx issues a high-entropy access token. Only a hash of the token is stored. The raw token is delivered through a transactional email link, expires 30 days after the booking's final appointment ends, and can be revoked. It grants read-only access to that single booking. It does not permit cancellation, rescheduling, profile access, or access to any other booking. Guests must sign in or contact the business for changes.

Guest confirmation pages must not expose sensitive intake answers. The email contains a link and a minimal booking summary, not private intake content.

## Intake Forms

Owners and Managers can create reusable intake templates and assign them to one or more services. Supported question types are:

- short text;
- long text;
- single choice;
- multiple choice;
- yes/no;
- date;
- required consent.

Questions can be required, optional, and marked sensitive. Customer identity fields remain separate from intake answers.

Each booking stores an immutable snapshot of the applicable form definition and its submitted responses. Editing a template affects future bookings only. When multiple services are booked, duplicate template questions are de-duplicated using stable question identifiers while service-specific questions retain their service context.

Sensitive questions require an explicit consent statement during checkout. Sensitive response payloads are encrypted at the application layer before database storage. Encryption keys are supplied through deployment secrets and are not stored in the database.

Sensitive intake data must never appear in URLs, logs, analytics events, notification bodies, dashboard previews, general customer lists, or finance exports.

Owners configure a retention period for sensitive responses. A scheduled retention job deletes expired encrypted responses while preserving the booking, form snapshot metadata, consent evidence, and audit history required for operational and financial records.

## Booking Details and Role Permissions

### Owner

Owners can view booking details across every business location. Details include customer contact information, services, date and time, assigned staff, status, payment state, operational notes, intake responses, and audit-relevant events.

Owners can manage staff schedules, time off, intake templates, locations, and booking policies.

### Manager

Managers can view and operate bookings only for authorized locations. They can:

- view complete booking details;
- create a booking for a registered or walk-in customer;
- complete the applicable intake form during booking creation;
- assign qualified staff;
- manage booking lifecycle states;
- manage recurring staff schedules and time-off exceptions within their location scope.

### Staff

Staff receive a **My bookings** view limited to bookings assigned to their membership. Assigned-booking details include the customer contact information, service details, operational notes, and intake responses required to perform the service.

Unassigned staff cannot retrieve customer contact details, booking details, or intake responses through the user interface, server actions, APIs, or guessed identifiers. Staff do not receive access to the general customer directory.

### Accounts

Accounts users retain finance-only access for authorized locations. Intake answers and unrelated customer profile information are excluded from finance views and exports.

All sensitive intake views are authorized server-side and append an audit entry identifying the actor, booking, access type, and timestamp. List and preview endpoints return only the minimum data needed for their interface.

## Customer Directory

The placeholder Customers page becomes a location-scoped Owner and Manager directory. It shows identity, contact details, booking counts, latest and upcoming visits, and non-sensitive operational context. Selecting a customer opens their authorized booking history. Sensitive intake answers remain attached to individual booking details and are never aggregated into the directory.

## Storefront URL Instead of “Slug”

A slug is the URL-safe unique identifier used in a storefront address, such as `island-glow-beauty-bar` in `/s/island-glow-beauty-bar`.

The Owner interface will relabel this field **Storefront URL** and generate it from the business name. The interface shows a full URL preview. Editing moves under advanced settings and warns that the public address will change. A changed slug must create a redirect record from the previous slug so saved and shared links remain usable.

Location slugs follow the same presentation pattern where exposed to business users.

## Finance, Provider Settlement, and Banking

The Finance workspace remains the canonical view of booking revenue, cash collections, online payment requests, refunds, Booktrx commissions, provider fees, payouts, and outstanding balances.

Each business connects online payments through a provider-hosted merchant onboarding flow. Bank details are entered directly into the provider's secure interface. Booktrx stores only provider account references, verification state, capabilities, and non-sensitive payout metadata. Booktrx never stores online-banking credentials.

Payment implementation uses a provider-neutral adapter with operations for merchant onboarding, payment creation, webhook verification, refunds, account status, and payout status. A provider will be selected only after current Saint Lucia merchant onboarding, XCD or supported settlement currency, bank payout, webhook, refund, and platform-fee capabilities are confirmed from official sources.

Owners and Accounts users can see gross amount, Booktrx commission, provider fees, refunds, net amount, payout state, settlement date, and provider reference. Provider failures and verification requirements display actionable status without implying funds were collected.

Cash remains recorded through the existing audited cash ledger.

Bank-feed imports and automated reconciliation are deferred. The payment and ledger models will nevertheless carry stable external transaction references and reconciliation states so the later phase can match bank transactions to payouts, fees, refunds, cash deposits, and booking records without redesigning the core ledger.

## Data Model Direction

Forward-only Prisma migrations will introduce or extend records for:

- location coordinates and coordinate provenance;
- storefront slug redirects;
- intake templates, sections, questions, and service assignments;
- immutable booking intake snapshots and encrypted response payloads;
- consent evidence and sensitive-access audit events;
- guest booking access tokens with hash, expiry, and revocation state;
- payment-provider business accounts;
- provider transactions, refunds, commissions, fees, and payouts;
- external reconciliation identifiers and states for future bank imports.

Existing bookings, finance records, schedules, users, and business data will be preserved. Migrations must not rewrite historical booking prices, statuses, policy snapshots, or cash audit evidence.

## Error Handling and Security

- All role and location permissions are enforced on the server.
- Guest tokens are high entropy, stored only as hashes, scoped to one booking, time limited, and revocable.
- Booking creation and payment operations use idempotency keys.
- Availability is rechecked under the existing scheduling locks before a booking is committed.
- Sensitive response decryption occurs only after authorization and creates an audit record.
- Geolocation errors never prevent manual discovery.
- Provider webhook signatures are verified before state changes.
- Payment, refund, and payout state transitions are monotonic and replay safe.
- User-facing errors distinguish invalid input, expired holds, unavailable slots, denied access, unavailable integrations, and recoverable provider failures without leaking private data.

## Testing and Acceptance Criteria

The release requires:

- unit tests for distance ordering, date availability summaries, guest-token validation, form snapshots, encryption boundaries, retention, and payment state transitions;
- authorization tests covering every Owner, Manager, Staff, Accounts, customer, and guest boundary;
- API integration tests for availability ranges, guest booking creation, view-only guest links, booking details, and sensitive-intake audit events;
- database migration and rollback-safety review using a production-shaped fixture;
- browser tests for manual and device-location discovery, optional sign-in, disabled dates, intake validation, guest confirmation, Manager booking creation, and assigned Staff access;
- negative tests proving unassigned Staff, Accounts users, guests, and cross-business actors cannot retrieve protected details;
- accessibility checks for the calendar, intake controls, error summaries, and booking-detail disclosures;
- responsive checks for customer, Manager, Staff, Owner, and Accounts pages;
- type checking, production build, and deployment readiness checks;
- provider sandbox tests before online payments can be enabled.

The customer portion is complete when a guest can find a nearby business, select only a bookable date and time, submit required customer and intake information, choose cash where supported, receive a view-only confirmation link, and complete the flow without creating an account.

The operations portion is complete when Managers can schedule staff and create/view intake-backed bookings, Owners can manage the full business scope, assigned Staff can safely view the details required to perform their appointments, unassigned Staff cannot access those details, and Accounts can accurately trace booking revenue and payout state without accessing sensitive intake data.

## Deferred Work

- direct bank-feed imports;
- automatic matching of bank transactions to Booktrx ledger entries;
- multi-country currency and timezone configuration beyond the initial launch policy;
- guest cancellation and rescheduling;
- storing precise customer coordinates or continuous location tracking.
