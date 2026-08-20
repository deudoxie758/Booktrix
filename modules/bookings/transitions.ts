import type { OrderStatus, SegmentStatus } from './types'

const segmentTransitions: Record<SegmentStatus, SegmentStatus[]> = {
  REQUESTED: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  NO_SHOW: [],
}

const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['HELD', 'EXPIRED'],
  HELD: ['PAYMENT_PENDING', 'REQUESTED', 'CONFIRMED', 'EXPIRED'],
  PAYMENT_PENDING: ['REQUESTED', 'CONFIRMED', 'EXPIRED'],
  REQUESTED: ['CONFIRMED', 'PARTIALLY_CANCELLED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'PARTIALLY_CANCELLED', 'CANCELLED'],
  COMPLETED: [],
  PARTIALLY_CANCELLED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  EXPIRED: [],
}

export function assertSegmentTransition(from: SegmentStatus, to: SegmentStatus) {
  if (!segmentTransitions[from].includes(to)) throw new Error('INVALID_BOOKING_TRANSITION')
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (!orderTransitions[from].includes(to)) throw new Error('INVALID_BOOKING_TRANSITION')
}
