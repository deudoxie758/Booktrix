import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), findUser: vi.fn(), findBooking: vi.fn(), findReview: vi.fn(), createReview: vi.fn() }))
vi.mock('next-auth/react', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  user: { findUnique: mocks.findUser },
  booking: { findFirst: mocks.findBooking },
  review: { findUnique: mocks.findReview, create: mocks.createReview },
} }))

import { POST } from '@/app/api/reviews/route'

const request = (body: object) => new Request('https://booktrx.test/api/reviews', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

describe('verified review eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ user: { email: 'customer@example.com' } })
    mocks.findUser.mockResolvedValue({ id: 'customer-1' })
    mocks.findBooking.mockResolvedValue(null)
    mocks.findReview.mockResolvedValue(null)
    mocks.createReview.mockResolvedValue({ id: 'review-1' })
  })

  it('rejects a booking that is not a completed booking owned by the reviewer at that storefront', async () => {
    const response = await POST(request({ spaId: 'spa-1', bookingId: 'booking-elsewhere', rating: 5, title: 'Great', comment: 'Great service.' }) as never)

    expect(response.status).toBe(403)
    expect(mocks.createReview).not.toHaveBeenCalled()
  })

  it('rejects ratings outside the 1–5 range before touching the database', async () => {
    const response = await POST(request({ spaId: 'spa-1', bookingId: 'booking-1', rating: 99, title: 'No', comment: 'Invalid.' }) as never)

    expect(response.status).toBe(400)
    expect(mocks.findBooking).not.toHaveBeenCalled()
  })

  it('rejects a second review for the same completed booking', async () => {
    mocks.findBooking.mockResolvedValue({ id: 'booking-1' })
    mocks.findReview.mockResolvedValue({ id: 'existing-review' })

    const response = await POST(request({ spaId: 'spa-1', bookingId: 'booking-1', rating: 5, title: 'Great', comment: 'Great service.' }) as never)

    expect(response.status).toBe(409)
    expect(mocks.createReview).not.toHaveBeenCalled()
  })

  it('returns a conflict when two eligible review requests race', async () => {
    mocks.findBooking.mockResolvedValue({ id: 'booking-1' })
    mocks.createReview.mockRejectedValue({ code: 'P2002' })

    const response = await POST(request({ spaId: 'spa-1', bookingId: 'booking-1', rating: 5, title: 'Great', comment: 'Great service.' }) as never)

    expect(response.status).toBe(409)
  })
})
