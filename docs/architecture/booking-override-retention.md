# Booking override retention

`BookingOverride` is durable historical evidence. Its `segmentId` is retained as
a plain identifier, so removal of resettable booking fixtures neither cascades
into override evidence nor is blocked by it. The development seed never deletes
override rows.

Managed MySQL installations with binary logging can reject `CREATE TRIGGER`
without the `SUPER` privilege (error 1419). Accordingly, override immutability is
enforced at the application boundary: `modules/bookings/overrides.ts` exposes
create-only persistence and always writes the accompanying `AuditLog` record.
No application update or delete operation exists for `BookingOverride`; source
guard tests protect that boundary. Database administrators remain responsible
for restricting direct SQL write access to the application account.

## Recovering a partially applied `20260818180000` migration

When statements 1–4 completed (column, unique index, order-to-hold foreign key,
and removal of the override-to-segment foreign key) and the first trigger failed,
do not replay the SQL: those four operations are already present. First verify
that exact state in the managed MySQL console:

```sql
SHOW COLUMNS FROM `BookingOrder` LIKE 'sourceHoldToken';
SHOW INDEX FROM `BookingOrder` WHERE Key_name = 'BookingOrder_sourceHoldToken_key';
SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND CONSTRAINT_NAME IN ('BookingOrder_sourceHoldToken_fkey', 'BookingOverride_segmentId_fkey');
SHOW TRIGGERS WHERE `Table` = 'BookingOverride';
```

Expected: the column and unique index exist; `BookingOrder_sourceHoldToken_fkey`
references `BookingHold` with `RESTRICT`; `BookingOverride_segmentId_fkey` is
absent; and no `BookingOverride` triggers exist. After deploying code containing
the revised migration, resolve only this failed migration and continue deployment:

```sh
npx prisma migrate resolve --applied 20260818180000_booking_concurrency_audit
npx prisma migrate deploy
```
