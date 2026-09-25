# Booktrx Availability Calendar Implementation Plan

**Goal:** Prevent customers from selecting dates that cannot satisfy their selected service sequence.

**Architecture:** Add a pure date-summary calculation over the existing scheduling facts, expose it from a bounded public endpoint, and replace the unconstrained native date input with an accessible rolling calendar. Exact slot loading and transactional holds remain authoritative.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, React, Vitest, Playwright.

### Task 1: Availability date summaries

- Add pure daily summary logic and tests for closed, off-schedule, time-off, occupied, minimum-notice, and maximum-advance dates.
- Add `GET /api/availability/dates` using the same scheduling repository and service sequence rules as exact slots.
- Include business booking policy in scheduling facts.

### Task 2: Accessible booking calendar

- Add an accessible rolling date chooser that disables dates absent from the summary.
- Load summaries only after location selection and preserve exact-slot loading after an enabled date is selected.
- Add UI and browser coverage for disabled and enabled dates, errors, and manual recovery.

### Task 3: Verification

- Run focused tests, Prisma validation, typecheck, complete unit suite, production build, and the booking browser journey where the local database is available.
