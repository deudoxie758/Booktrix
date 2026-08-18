import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('booking override retention', () => {
  it('does not delete immutable override evidence from the development seed', () => {
    const seed = readFileSync(join(root, 'prisma/seed.ts'), 'utf8')
    expect(seed).not.toContain('prisma.bookingOverride.deleteMany')
  })

  it('drops the segment foreign key and retains append-only triggers', () => {
    const migration = readFileSync(join(root, 'prisma/migrations/20260818180000_booking_concurrency_audit/migration.sql'), 'utf8')
    expect(migration).toContain('DROP FOREIGN KEY `BookingOverride_segmentId_fkey`')
    expect(migration).not.toContain('ADD CONSTRAINT `BookingOverride_segmentId_fkey`')
    expect(migration).toContain('CREATE TRIGGER `BookingOverride_prevent_update`')
    expect(migration).toContain('CREATE TRIGGER `BookingOverride_prevent_delete`')
  })
})
