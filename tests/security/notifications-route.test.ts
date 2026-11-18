import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUser: vi.fn(),
  updateNotification: vi.fn(),
  updateNotifications: vi.fn(),
}))

vi.mock('next-auth/react', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  user: { findUnique: mocks.findUser },
  notification: { update: mocks.updateNotification, updateMany: mocks.updateNotifications },
} }))

import { PATCH } from '@/app/api/notifications/route'

describe('notification mutation authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ user: { email: 'customer@example.com' } })
    mocks.findUser.mockResolvedValue({ id: 'customer-1' })
    mocks.updateNotification.mockResolvedValue({ id: 'notification-2', read: true })
    mocks.updateNotifications.mockResolvedValue({ count: 0 })
  })

  it('does not allow a customer to update another customer’s notification', async () => {
    const request = new Request('https://booktrx.test/api/notifications', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notificationId: 'notification-2', read: true }),
    })

    const response = await PATCH(request as never)

    expect(response.status).toBe(404)
    expect(mocks.updateNotification).not.toHaveBeenCalled()
  })
})
