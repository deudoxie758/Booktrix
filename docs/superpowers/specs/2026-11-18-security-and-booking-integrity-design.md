# Security and Booking Integrity Design

## Intent

Close every defect identified in the 2026-11-18 Booktrx audit without changing the product's public visual design. Customer-controlled values must never determine discounts, authorization must always include record ownership, and booking/reward mutations must be safe under retries and concurrency.

## Required behavior

- The unsafe standalone loyalty-redemption endpoint is retired until loyalty can be integrated into the canonical booking-order transaction. Dead legacy checkout code must not remain callable.
- Completing a booking awards points once, only on the first transition into `COMPLETED`.
- A user may update only their own notifications.
- An owner may update only support tickets for a storefront they own; unscoped tickets are not owner-manageable.
- A review is verified only when its booking belongs to the reviewer, belongs to the reviewed storefront, and is completed. A booking may receive at most one review and ratings are limited to 1–5.
- Legacy booking creation uses the scheduling-safe path or equivalent transactional locking, supports adjacent appointments, and never treats an unassigned professional as a storefront-wide overlap query.
- Staff remain read-only and cannot mutate legacy booking status.

## Constraints

- Preserve Next.js, Prisma, MySQL, NextAuth, and existing Booktrx styling.
- Preserve guest booking in the current `/book/[businessSlug]` flow.
- Avoid a destructive migration; schema changes must be additive.
- Existing API callers should receive explicit 4xx responses for rejected input.

