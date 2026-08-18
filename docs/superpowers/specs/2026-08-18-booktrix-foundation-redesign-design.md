# Booktrix Foundation and Redesign Design

## Purpose

Booktrix is a Saint Lucia–based marketplace and operations platform for appointment-driven businesses. It will initially highlight beauty and wellness businesses while remaining technically and visually suitable for all service industries. Visitors can browse publicly; authentication is required to book or access any customer, business, finance, or administrative workspace.

This specification defines the overall product architecture and the implementation boundary for Phase 1: Foundation and Redesign. Later phases will receive their own implementation specifications before development.

## Approved Product Decisions

- The product name is **Booktrix**. `Flo` is only the existing project directory.
- The existing Next.js, Prisma, and MySQL project will be evolved rather than replaced wholesale.
- Booktrix will support multiple businesses and multiple physical locations per business.
- Businesses require platform-administrator approval before they can publish.
- One user account can have different business roles and location assignments.
- The business interface is one shared, role-aware dashboard rather than separate applications per role.
- Customers can browse without an account but must authenticate before checkout.
- Services can allow full online payment, a fixed or percentage deposit, or cash at the appointment.
- Confirmation can be automatic or require manual approval by service.
- Customers can book multiple services in one checkout and select a professional or “any available.”
- Services support configurable customer capacity for one-to-one and group appointments.
- In-app and email notifications are in scope; SMS and WhatsApp are prepared as later adapters.
- Online payments use WiPay through a provider-neutral payment boundary. Stripe-specific assumptions will be removed.
- Each storefront connects a verified WiPay Business account so merchant proceeds go directly to the business.
- Booktrix earns both a recurring subscription and a configurable commission on online amounts collected. The business absorbs the commission. Cash bookings carry no launch commission.
- The visual direction combines Modern Soft marketplace usability with Quiet Luxury typography, space, and nude/cocoa tones.

## Delivery Decomposition

The complete platform will be delivered through separately specified phases:

1. Foundation and redesign
2. Marketplace and scheduling
3. Business operations
4. Payments and finance
5. Administration and launch readiness

Phase 1 creates the boundaries, tenancy model, permissions, design system, authentication, and onboarding lifecycle required by every later phase. It does not claim production-ready scheduling or live payment processing.

## Application Architecture

Booktrix will use a modular monolith: one deployable Next.js application divided into cohesive domain modules with explicit server-side interfaces.

The target modules are:

- **Marketplace:** public discovery, categories, search, storefronts, reviews, and favourites.
- **Identity:** authentication, sessions, account recovery, profiles, and global roles.
- **Organizations:** businesses, locations, memberships, assignments, applications, approval, and publication.
- **Catalog:** services, qualifications, policies, prices, intake requirements, and capacity.
- **Scheduling:** hours, staff availability, time off, buffers, slot holds, and appointment segments.
- **Payments:** WiPay checkout, cash, deposits, refunds, commissions, and reconciliation.
- **Operations:** role-aware booking, customer, staff, service, and calendar tools.
- **Finance:** payment records, ledgers, invoices, subscriptions, reports, and exports.
- **Administration:** approval, moderation, configuration, support, audits, and platform reporting.
- **Notifications:** in-app and email delivery with future SMS and WhatsApp adapters.

Next.js provides the responsive UI and server-side application layer. Prisma owns database access to MySQL. Domain services enforce rules; pages and route handlers must not duplicate authorization, pricing, or lifecycle logic.

## Tenancy and Identity Model

The current single-role-per-user model will be replaced by contextual memberships.

Core relationships:

`User → BusinessMembership → Business → Location`

A user can belong to multiple businesses. A membership assigns one business role and can be linked to one or more locations. Platform administrators remain global roles independent of business membership.

### Roles

- **Platform Admin:** platform-wide businesses, applications, plans, commissions, users, support, moderation, audits, and reporting.
- **Owner:** complete control of one business, its locations, billing, settings, role assignments, and consolidated reporting.
- **Manager:** operational access to assigned locations, including bookings, customers, staff, schedules, services, and operational reports.
- **Accounts:** payments, commissions, invoices, refunds, reconciliation, and exports for authorized locations; no staff or appointment administration.
- **Staff:** personal availability, assigned appointments, required customer intake information, and allowed appointment status changes.
- **Customer:** discovery, bookings, payments, receipts, reviews, favourites, profile, and notifications.

Permission checks must occur server-side for every protected read and write. Interface visibility is a usability aid, never the security boundary. Business-scoped records must include an unambiguous business relationship; location-owned records must also carry location scope.

## Business Lifecycle

The primary lifecycle is:

`Application → Under Review → Approved → Setup → Published`

Terminal or exceptional states include rejected, suspended, and archived. Approval does not automatically publish a storefront. An approved owner must complete required business and location setup before publication. Suspension prevents public visibility and new bookings while retaining historical operational and financial records.

Every approval, rejection, suspension, restoration, role change, and other sensitive administrative action creates an immutable audit entry.

## Marketplace and Booking Architecture

The public marketplace will eventually support search by service, category, business, and Saint Lucian location. Booking requires authentication immediately before checkout, allowing public discovery without weakening account ownership of bookings.

A customer order can contain multiple appointment segments. Each segment records its service, location, professional assignment, start and end time, attendee count, price allocation, and status. A shared order records the customer, totals, checkout, and payment relationship.

Availability will derive from location hours, staff working schedules, time off, service duration, preparation and cleanup buffers, existing appointments, and service capacity. Customers do not select rooms or equipment in the initial release. Resource scheduling may be introduced later behind the availability module without changing the public booking contract.

A short-lived hold protects selected capacity during checkout. Expired or failed checkout releases the hold. A manager can create bookings for existing or walk-in customers. Authorized overrides require a reason and audit record.

## Payment and Revenue Architecture

Payment behavior will be provider-neutral at the domain boundary, with WiPay as the initial adapter. Booktrix will use WiPay-hosted checkout so it does not store or transmit card details. Browser redirects provide immediate customer feedback, while server-side response-hash verification and webhooks determine authoritative transaction state.

Each storefront connects a verified WiPay Business account. Customer proceeds flow to that merchant rather than to a central Booktrix balance. Booktrix records:

- merchant payment and refund events;
- fixed or percentage deposits and remaining balances;
- cash collections and adjustments;
- subscription invoices and payments;
- configurable commission assessed only on online money collected;
- proportional commission reversal on refunds.

Cash bookings do not incur launch commission. Subscription collection supports an automated provider flow when WiPay merchant capabilities and approval permit it, plus an invoice/payment-link fallback. Financial and commission records use append-only ledger entries. Manual adjustments require reasons and audit records.

All initial monetary amounts use integer cents and explicit `XCD` currency values. The schema keeps currency explicit to allow later expansion without silently mixing currencies.

## Notifications

Launch channels are in-app and email. Notification events include booking requests, confirmations, changes, cancellations, reminders, payment receipts, refunds, support replies, and relevant business alerts.

Domain events produce notification requests without coupling booking or payment success to immediate delivery. Delivery failures retry independently. SMS and WhatsApp will use the same channel interface in a later phase.

## Experience and Visual System

The public marketplace uses a Modern Soft structure with Quiet Luxury styling:

- warm cream and nude foundations;
- cocoa primary text and controls;
- restrained clay accents;
- editorial display typography with a readable interface typeface;
- rounded surfaces, generous spacing, subtle shadows, and minimal motion;
- accessible contrast, visible focus, keyboard support, and reduced-motion behavior.

Customer pages remain spacious and discovery-led. Business and accounts interfaces use the same system at higher information density. Mobile design is intentional: touch-friendly booking steps, sticky primary actions, agenda-first manager views, and finance summaries that drill into detailed records rather than forcing desktop tables into a narrow viewport.

## Phase 1 Scope

Phase 1 will:

1. Inventory current behavior and preserve useful customer, storefront, authentication, and booking data through explicit migrations.
2. Establish domain folders and shared server boundaries without unnecessary service infrastructure.
3. Introduce Business, Location, BusinessMembership, LocationAssignment, BusinessApplication, and lifecycle/audit concepts.
4. Migrate existing owner, employee, accountant, and administrator relationships into the contextual role model.
5. Implement reusable server-side authorization helpers and protect all retained routes.
6. Create Booktrix design tokens, typography, components, responsive shells, and role-aware navigation.
7. Redesign public entry, authentication, customer shell, business shell, accounts shell, and administrator shell using representative states.
8. Implement business application, administrator review, owner setup checklist, and publication gating.
9. Define provider-neutral payment contracts and remove direct Stripe coupling from domain logic; WiPay transaction implementation remains Phase 4.
10. Preserve or adapt existing functionality that remains valid and explicitly retire obsolete or duplicate routes.

Phase 1 will not include final marketplace search, the complete availability engine, production WiPay processing, subscription collection, full financial reporting, or launch notification delivery. Those belong to later specifications.

## Reliability and Security Requirements

- Passwords remain strongly hashed; sessions expire and are invalidated appropriately.
- Registration, login, recovery, and sensitive mutations are rate limited.
- Email verification is required before booking or accepting a business invitation.
- Authorization tests cover cross-business and cross-location access denial.
- Database migrations are additive and data-preserving until verification permits cleanup.
- Sensitive role, lifecycle, financial, booking-override, and administrative actions are audited.
- Customer data access is minimized by role and appointment need.
- Secrets remain server-side and are validated at startup or integration entry points.
- Errors shown to users are actionable but do not expose internals; diagnostic detail goes to secure logs.

## Testing Strategy

Phase 1 requires:

- unit tests for role and location permission decisions;
- integration tests using MySQL for membership, application, approval, setup, publication, and audit behavior;
- migration tests against representative existing records;
- end-to-end journeys for public browsing, customer authentication, business application, administrator approval, owner setup, and role-aware dashboard access;
- explicit negative tests for cross-tenant access;
- responsive checks on common phone, tablet, and desktop dimensions;
- accessibility checks for navigation, forms, dialogs, validation, and focus order;
- type checking, linting, and a production build before completion.

Later phases add scheduling-concurrency, WiPay sandbox, webhook, refund, ledger, email, and full role-journey test suites.

## Completion Criteria for Phase 1

Phase 1 is complete when:

- existing supported data has a tested migration path;
- the contextual business and location permission model is enforced server-side;
- public, customer, business, accounts, and administrator shells use the approved responsive visual system;
- a business can apply, an administrator can decide the application, and an approved owner can complete setup and publish only when requirements are met;
- each role sees and can access only its authorized navigation and server operations;
- the payment boundary no longer assumes Stripe in domain code;
- audit records cover all Phase 1 sensitive actions;
- the defined automated checks pass in a production-like configuration.

## Later-Phase Constraints

Later design work must preserve these approved contracts: multi-location tenancy, contextual roles, public discovery with authenticated checkout, multi-service orders, staff choice or any-available assignment, configurable capacity, full/deposit/cash policies, configurable confirmation, direct merchant WiPay accounts, storefront-absorbed online commission, subscription plus commission revenue, and provider-independent payment and notification boundaries.
