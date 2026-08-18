import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('scheduling lock consumers', () => {
  it.each([
    'modules/scheduling/holds.ts',
    'modules/bookings/repository.ts',
    'modules/bookings/management.ts',
  ])('%s uses the shared ISO bucket parser', (relativePath) => {
    const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8')

    expect(source).toContain('schedulingLockBucketAt(')
    expect(source).not.toContain("lastIndexOf(':')")
  })
})
