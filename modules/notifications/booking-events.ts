export type BookingNotificationEvent = 'BOOKING_REQUESTED' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED'

export function createBookingNotificationRequest(input: { event: BookingNotificationEvent; orderId: string; userId: string }) {
  return { channel: 'IN_APP' as const, ...input, createdAt: new Date() }
}

export async function persistBookingNotification(input: { event: BookingNotificationEvent; orderId: string; userId: string }) {
  const { prisma } = await import('@/lib/prisma')
  const confirmed = input.event === 'BOOKING_CONFIRMED'
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: confirmed ? 'BOOKING_CONFIRMED' : 'BOOKING_REMINDER',
      title: confirmed ? 'Booking confirmed' : 'Booking received',
      message: confirmed ? 'Your Booktrix appointment is confirmed.' : 'Your booking request was received.',
      data: { event: input.event, orderId: input.orderId },
    },
  })
}
