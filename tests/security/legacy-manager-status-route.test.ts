import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireActor: vi.fn(), requireBusinessAccess: vi.fn(), findBooking: vi.fn(), findBusiness: vi.fn(),
  updateBooking: vi.fn(), updateBookings: vi.fn(), updateUser: vi.fn(), createAudit: vi.fn(),
}))
vi.mock('@/modules/identity/session', () => ({ requireActor: mocks.requireActor }))
vi.mock('@/modules/organizations/access', () => ({ requireBusinessAccess: mocks.requireBusinessAccess }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  booking: { findUnique: mocks.findBooking, update: mocks.updateBooking, updateMany: mocks.updateBookings },
  business: { findUnique: mocks.findBusiness }, user: { update: mocks.updateUser }, auditLog: { create: mocks.createAudit },
} }))

import { POST } from '@/app/api/manager/updateBookingStatus/route'

const request = (body: object) => new Request('https://booktrx.test/api/manager/updateBookingStatus', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

describe('legacy booking status authorization and rewards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireActor.mockResolvedValue({ id: 'actor-1', platformRole: 'OWNER' })
    mocks.findBooking.mockResolvedValue({ id: 'booking-1', spaId: 'spa-1', userId: 'customer-1', status: 'CONFIRMED', paymentStatus: 'UNPAID', totalCents: 5000, paidCents: 0, notes: null })
    mocks.findBusiness.mockResolvedValue({ id: 'business-1' })
    mocks.requireBusinessAccess.mockResolvedValue({ membership: { role: 'STAFF' } })
    mocks.updateBooking.mockResolvedValue({})
    mocks.updateBookings.mockResolvedValue({ count: 1 })
  })

  it('keeps staff access read-only', async () => {
    const response = await POST(request({ bookingId: 'booking-1', status: 'COMPLETED' }))
    expect(response.status).toBe(403)
    expect(mocks.updateBooking).not.toHaveBeenCalled()
  })

  it('does not award points when an already-completed booking is submitted as completed again', async () => {
    mocks.requireBusinessAccess.mockResolvedValue({ membership: { role: 'OWNER' } })
    mocks.findBooking.mockResolvedValue({ id: 'booking-1', spaId: 'spa-1', userId: 'customer-1', status: 'COMPLETED', paymentStatus: 'PAID', totalCents: 5000, paidCents: 5000, notes: null })
    mocks.updateBookings.mockResolvedValue({ count: 0 })

    const response = await POST(request({ bookingId: 'booking-1', status: 'COMPLETED' }))

    expect(response.status).toBe(200)
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('does not award points when another request wins the completion transition', async () => {
    mocks.requireBusinessAccess.mockResolvedValue({ membership: { role: 'OWNER' } })
    mocks.updateBookings.mockResolvedValue({ count: 0 })

    const response = await POST(request({ bookingId: 'booking-1', status: 'COMPLETED' }))

    expect(response.status).toBe(200)
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })
})
