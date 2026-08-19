import { describe, expect, it } from 'vitest'

import { checkReadiness } from '@/lib/readiness'

describe('readiness check', () => {
  it('reports a safe ready response when the database responds', async () => {
    const result = await checkReadiness({ queryDatabase: async () => undefined })
    expect(result).toEqual({ status: 200, body: { status: 'ok', service: 'booktrix', database: 'reachable' } })
  })

  it('reports unavailable without exposing the database error', async () => {
    const result = await checkReadiness({ queryDatabase: async () => { throw new Error('mysql://secret@host/private') } })
    expect(result).toEqual({ status: 503, body: { status: 'unavailable', service: 'booktrix', database: 'unreachable' } })
    expect(JSON.stringify(result)).not.toContain('secret')
  })
})
