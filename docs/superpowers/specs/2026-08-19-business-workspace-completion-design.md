# Booktrix Business Workspace Completion Design

Date: 2026-08-19
Status: Approved design

## Purpose

Complete the Booktrix business workspace so owners, managers, staff, and accounts users have useful, role-appropriate tools instead of placeholder pages. The finished workspace must remain responsive, use the current cream, nude, clay, and cocoa design system, preserve tenant and location boundaries, and reflect real persisted data.

This phase completes operational business management for staging. It does not simulate online payment settlement, subscriptions, platform commissions, refunds, or provider payouts before a supported payment provider is integrated.

## Experience Principles

- The business workspace is a coherent application, not a collection of disconnected pages.
- Every visible figure or status comes from canonical persisted data.
- Navigation and actions adapt to the active business role and assigned locations.
- Hidden interface controls are never the only authorization boundary; server actions enforce the same policy.
- Historical booking, membership, finance, and audit evidence is retained rather than destructively deleted.
- Unsupported capabilities are labelled clearly rather than presented as working controls.

## Workspace Shell and Navigation

All business roles use one responsive `WorkspaceShell` with:

- A Booktrix logo that links to `/business` while inside a business workspace.
- A clearly separate `View marketplace` link to the public discovery experience.
- The active business and, where relevant, active location.
- A role label and role-specific navigation.
- `My account` and `Sign out` actions. Sign out ends the session and returns to `/`.
- Mobile navigation that exposes the same permitted destinations without horizontal overflow.

Role navigation:

| Role | Destinations |
| --- | --- |
| Owner | Overview, Calendar, Customers, Services, Team, Locations, Finance, Settings |
| Manager | Overview, Calendar, Customers, Services, Team, Locations |
| Staff | Overview, My Schedule, Customers |
| Accounts | Overview, Finance, Locations |
| Platform Admin | Remains in the separate platform-admin workspace |

Users with more than one business membership continue to use the secure business selector. A stale selected-business cookie falls back to an active authorized membership.

## Authorization Model

Owners have full control of their business workspace. They may add, deactivate, and assign Owner-external operational roles including Manager, Accounts, and Staff. The original/last active owner cannot be removed or demoted through ordinary team management.

Managers may manage Staff members only. They can invite Staff, edit Staff location assignments and qualifications, and deactivate Staff. They cannot grant or manage Owner, Manager, or Accounts access, and cannot access Finance or Settings.

Staff see only their assigned locations, schedules, customers needed for assigned work, appointments, and time-off information. They cannot mutate other team members, services, locations, finance, or business policy.

Accounts users see Finance and location information within assigned locations. They may record cash collection but cannot alter services, schedules, team membership, or business settings.

Every mutation validates the actor, active membership, target business, role, and authorized locations on the server. Cross-business identifiers are rejected even if submitted directly.

## Role-Aware Overview

The `/business` page becomes a real dashboard.

Owner and Manager overview:

- Today’s appointment count and agenda preview.
- Pending booking approvals.
- Staff scheduled today.
- Location utilization derived from scheduled capacity.
- Operational alerts such as unassigned requested bookings, expiring invitations, services without qualified active staff, and locations missing opening hours.
- Quick actions for adding a booking and opening Calendar, Team, or Services.

Staff overview:

- Next assigned appointment.
- Today’s assigned schedule.
- Assigned location information.
- Upcoming approved time off.
- Shortcut to the full personal schedule.

Accounts overview:

- Booked revenue for the selected period.
- Recorded cash collected.
- Cash still due at appointments.
- Pending online payment requests.
- Recent finance activity.
- Shortcut to the Finance ledger.

All metrics respect authorized location assignments.

## Locations

Owners and Managers can:

- Add a location with name, slug, address, phone, email, and active state.
- Edit location identity and contact details.
- Configure weekly opening and closing hours, including closed days.
- Activate or deactivate a location.
- Review which services and team members are assigned to the location.

Accounts users receive a read-only location view for their authorized locations.

Location records with historical bookings are never destructively deleted. Deactivation removes them from new public bookings while retaining bookings, finance, and audit history. Slugs must be unique within the business and all submitted location IDs must belong to the active business.

## Team and Invitations

Owners and Managers can invite team members by name and email. Owners may select Manager, Accounts, or Staff; Managers may select Staff only. Invitations also include initial location assignments and, for Staff, optional service qualifications.

Invitation behavior:

- Invitations expire seven days after creation.
- Tokens are random; only a hash is stored.
- Pending invitations can be resent, which rotates the token and expiry.
- Pending invitations can be revoked.
- For staging, the Team page presents a copyable invitation link after creation. The persistence and event boundary must remain ready for later email delivery.
- If the invited email already belongs to a Booktrix user, acceptance attaches the membership to that user.
- If no account exists, the invitation sends the visitor through sign-up and then resumes acceptance.
- Acceptance verifies the normalized email and active invitation before creating the membership and assignments.

Team management includes:

- Active and pending members.
- Role changes within the actor’s permission boundary.
- Location assignments.
- Staff service qualifications.
- Activation/deactivation while retaining historical assignment evidence.
- Clear indication when a member lacks a location or a Staff member lacks qualifications.

Role changes, invitation actions, assignments, and deactivation create audit records.

## Finance and Cash Collection

Finance is available to Owner and Accounts roles and is scoped to authorized locations.

The dashboard provides:

- Booked revenue.
- Completed-service revenue.
- Cash due.
- Cash collected.
- Pending online payment requests.
- Cancelled booking value shown separately from earned revenue.
- Filters for date range, location, payment state, and booking status.
- A booking-level transaction table with business, customer, services, appointment time, amount, method, and status.
- CSV export that applies the active authorization and filters.

Owner and Accounts users may record cash as collected. A collection record includes booking order, amount, collector, timestamp, and optional note. Recording is transactional, idempotent, cannot exceed the order’s cash amount due, and creates audit evidence. Corrections use an append-only adjustment rather than editing or deleting the original collection record.

Online payment requests remain visible as pending/unsupported where appropriate. The interface must not claim that provider settlement, subscription billing, commissions, refunds, or payouts are working before their integrations exist.

## Business Settings and Policies

Settings is Owner-only and includes:

- Public business name, slug, description, phone, email, and storefront identity fields.
- Default `XCD` currency and `America/St_Lucia` timezone. These are explicit settings with safe Saint Lucia defaults.
- Default automatic or manual booking confirmation.
- Minimum booking notice and maximum advance-booking window.
- Default preparation and cleanup buffers for new services.
- Cancellation and rescheduling notice windows and public policy text.
- Marketplace publication state with validation that required storefront data exists before publication.
- A truthful staging status for payment provider and subscription functionality.

Settings changes are validated, tenant-scoped, and audited. Changing defaults does not silently rewrite existing offerings or bookings.

## Data Model Additions

### BusinessInvitation

Stores business, normalized email, invited name, requested role, token hash, expiry, inviter, accepted/revoked timestamps, and lifecycle timestamps. Related invitation-location and invitation-qualification records capture initial scope without trusting client-supplied business relationships.

### BusinessPolicy

One policy record per business stores booking defaults, notice windows, default buffers, cancellation/rescheduling policy, currency, and timezone. Existing businesses receive safe defaults through a forward-only migration/backfill.

### CashCollection

An append-only record linked to `BookingOrder` stores amount, collector, collection timestamp, optional note, idempotency key, and adjustment relationship where applicable. Database constraints and transactional application prevent duplicate or excessive collection.

Existing `Business`, `Location`, `LocationHours`, `BusinessMembership`, `LocationAssignment`, `StaffQualification`, `BookingOrder`, `BookingSegment`, `BookingPaymentRequest`, and `AuditLog` remain the canonical entities for their domains.

## Mutations and Feedback

Server actions and route handlers return structured success or error results. Forms:

- Disable duplicate submissions.
- Keep entered values on validation failure where safe.
- Show focusable semantic error or success feedback.
- Confirm destructive-looking deactivation and revocation actions.
- Explain why an action is unavailable rather than silently hiding unexpected state.

Mutation transactions keep the domain write and audit evidence together. Notification/email delivery is asynchronous-ready and cannot make an already-committed mutation appear to fail.

## Responsive and Accessibility Requirements

- Core pages work at 320 px, tablet, and desktop widths without horizontal page overflow.
- Navigation is keyboard accessible and exposes current-page state.
- Forms have explicit labels, descriptions, and field-level/server errors.
- Dialogs or confirmation surfaces manage focus and support Escape where appropriate.
- Status changes use semantic live regions without excessive announcements.
- Tables provide a mobile card representation or controlled internal scrolling with accessible labels.
- Color is never the only indicator of role, status, or financial state.
- Motion respects reduced-motion preferences.

## Delivery Slices

1. Workspace shell, role navigation, sign-out, and role-aware Overview.
2. Locations create/edit/deactivate, hours, assignments summary, and read-only Accounts view.
3. Team invitations, acceptance, member roles, assignments, qualifications, and deactivation.
4. Finance aggregates, filters, ledger, CSV export, cash collection, adjustments, and audit evidence.
5. Business settings, policies, storefront publication validation, and truthful integration status.
6. Cross-role authorization review, responsive and accessibility journeys, production build, migration validation, and end-to-end regression coverage.

Each slice uses test-driven development, receives independent spec/security/code-quality review, and is committed separately. Shared database migrations are forward-only and verified against an isolated staging database before Railway deployment.

## Acceptance Criteria

- The business logo never unintentionally exits the active workspace.
- Every business role has an obvious account link and sign-out path.
- No permitted navigation destination is a placeholder.
- Owners can manage locations, team, finance, and settings.
- Managers can run operations and manage Staff without escalating privileges.
- Staff see only assigned work and locations.
- Accounts users can use a real, location-scoped finance ledger and record audited cash collection.
- Invitations expire, can be resent/revoked, and cannot grant unauthorized roles or locations.
- Finance figures reconcile to canonical booking and cash-collection records.
- Historical records remain available after location or membership deactivation.
- Cross-tenant and unassigned-location mutation attempts are denied.
- The completed workspace passes unit, integration, end-to-end, responsive, accessibility, type, build, and migration checks.

## Deferred Work

- Live online payment capture and provider webhooks.
- Platform subscription charging and commission settlement.
- Provider refunds and payouts.
- Production email/SMS delivery for invitations and booking events.
- Advanced accounting integration and statutory reporting.

The new boundaries must allow these capabilities to be added later without presenting them as available now.
