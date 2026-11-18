import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), findUser: vi.fn(), findTicket: vi.fn(), updateTicket: vi.fn() }))
vi.mock('next-auth/react', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  user: { findUnique: mocks.findUser },
  supportTicket: { findUnique: mocks.findTicket, update: mocks.updateTicket },
} }))

import { PATCH } from '@/app/api/manager/support/[id]/route'

describe('support ticket mutation authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ user: { email: 'owner@example.com' } })
    mocks.findUser.mockResolvedValue({ id: 'owner-1', role: 'OWNER', OwnedSpas: [{ id: 'spa-1' }] })
    mocks.findTicket.mockResolvedValue({ id: 'ticket-1', spaId: null })
  })

  it('does not let a storefront owner mutate an unscoped platform support ticket', async () => {
    const request = new Request('https://booktrx.test/api/manager/support/ticket-1', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'CLOSED' }),
    })
    const response = await PATCH(request as never, { params: { id: 'ticket-1' } })

    expect(response.status).toBe(403)
    expect(mocks.updateTicket).not.toHaveBeenCalled()
  })
})
