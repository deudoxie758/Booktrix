import { describe, expect, it } from 'vitest'

import { managedDatabaseUrl } from '@/lib/prisma-url'

describe('managedDatabaseUrl', () => {
  it('caps the application pool without discarding existing options', () => {
    const result = new URL(managedDatabaseUrl('mysql://user:pass@db.example/booktrix?sslaccept=strict'))

    expect(result.searchParams.get('sslaccept')).toBe('strict')
    expect(result.searchParams.get('connection_limit')).toBe('2')
    expect(result.searchParams.get('pool_timeout')).toBe('20')
  })

  it('preserves Prisma lazy configuration when DATABASE_URL is unavailable', () => {
    expect(managedDatabaseUrl(undefined)).toBeUndefined()
  })

  it('overrides unsafe pool settings already present in the URL', () => {
    const result = new URL(
      managedDatabaseUrl('mysql://user:pass@db.example/booktrix?connection_limit=20&pool_timeout=1')!,
    )

    expect(result.searchParams.get('connection_limit')).toBe('2')
    expect(result.searchParams.get('pool_timeout')).toBe('20')
  })
})
