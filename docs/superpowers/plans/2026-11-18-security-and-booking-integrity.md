# Security and Booking Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all authorization, loyalty, review, and legacy booking-integrity defects found in the Booktrx audit.

**Architecture:** Keep the current booking-order system authoritative and retire legacy entry points that trust browser-calculated financial values. Enforce record ownership and transition guards at the database mutation boundary.

**Tech Stack:** Next.js 14, TypeScript, Prisma, MySQL, NextAuth, Vitest

**Spec:** `docs/superpowers/specs/2026-11-18-security-and-booking-integrity-design.md`

## Global Constraints

- Preserve guest booking in `/book/[businessSlug]`.
- Staff access is view-only.
- Unsafe standalone loyalty redemption is unavailable until the canonical booking transaction supports it.
- Schema changes are additive and migration-safe.

## Review Focus

- Concurrent redemption must not produce a negative points balance.
- Retrying `COMPLETED` must not award points twice.
- Cross-user record identifiers must return 403/404 without mutation.
- Back-to-back appointments must not be treated as overlapping.
- Legacy endpoints must not bypass newer tenant and scheduling rules.

---

### Task 1: Loyalty and completion integrity

**Files:**
- Modify: `app/api/redeemPoints/route.ts`
- Modify: `app/s/[slug]/book/actions.ts`
- Modify: `app/api/manager/updateBookingStatus/route.ts`
- Modify: `app/manager/actions.ts`
- Create/Modify: focused tests under `tests/security/` and `tests/bookings/`

- [x] Write failing tests for unsafe redemption and duplicate completion rewards.
- [x] Run focused tests and confirm expected failures.
- [x] Retire unsafe redemption/legacy checkout and implement atomic transition-only rewards.
- [x] Run focused tests and confirm they pass.

### Task 2: Record ownership and review verification

**Files:**
- Modify: `app/api/notifications/route.ts`
- Modify: `app/api/manager/support/[id]/route.ts`
- Modify: `app/api/reviews/route.ts`
- Modify: `prisma/schema.prisma`
- Add: Prisma migration for one-review-per-booking constraint
- Create/Modify: focused API policy tests

- [x] Write failing tests for cross-user notifications, unscoped support tickets, and forged verified reviews.
- [x] Run focused tests and confirm expected failures.
- [x] Enforce scoped updates, validated review eligibility, and one review per booking.
- [x] Run focused tests and confirm they pass.

### Task 3: Legacy booking safety and staff permissions

**Files:**
- Modify: `app/s/[slug]/book/actions.ts`
- Modify: `app/api/manager/updateBookingStatus/route.ts`
- Create/Modify: booking concurrency and authorization tests

- [x] Confirm the unsafe customer and manager implementations are dead legacy surfaces redirected to canonical flows.
- [x] Remove the legacy implementations so their overlap and authorization defects are no longer callable.
- [x] Remove staff mutation access from the remaining compatibility status endpoint.
- [x] Run focused legacy-routing and authorization tests and confirm they pass.

### Task 4: Full verification

- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Inspect `git diff --check` and the final diff for unintended changes.
