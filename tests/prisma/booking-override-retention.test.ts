import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('booking override retention', () => {
  it('does not delete immutable override evidence from the development seed', () => {
    const seed = readFileSync(join(root, 'prisma/seed.ts'), 'utf8')
    expect(seed).not.toContain('prisma.bookingOverride.deleteMany')
  })

  it('drops the segment foreign key without managed-MySQL-incompatible triggers', () => {
    const migration = readFileSync(join(root, 'prisma/migrations/20260818180000_booking_concurrency_audit/migration.sql'), 'utf8')
    expect(migration).toContain('DROP FOREIGN KEY `BookingOverride_segmentId_fkey`')
    expect(migration).not.toContain('ADD CONSTRAINT `BookingOverride_segmentId_fkey`')
    expect(migration).not.toMatch(/CREATE\s+TRIGGER/i)
    expect(migration).not.toMatch(/DROP\s+TRIGGER/i)
  })

  it('keeps override persistence behind a create-only application boundary', () => {
    const overrideRepository = readFileSync(join(root, 'modules/bookings/overrides.ts'), 'utf8')
    const management = readFileSync(join(root, 'modules/bookings/management.ts'), 'utf8')
    const combined = `${overrideRepository}\n${management}`
    expect(combined).not.toMatch(/bookingOverride\.(?:update|updateMany|delete|deleteMany|upsert)\s*\(/)
    expect(management).not.toContain('bookingOverride.create')
    expect(overrideRepository).toMatch(/type OverrideWriter = \{\s*create\(/)
  })
})
