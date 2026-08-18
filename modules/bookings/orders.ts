import { calculateBookingPaymentAmounts, getAllowedPaymentChoices } from '@/modules/catalog/payment-options'
import type { HoldRecord } from '@/modules/scheduling/holds'

import type { CreateOrderInput, OfferingBookingPolicy, OrderStatus, SegmentStatus } from './types'

type CreatedOrder = {
  id: string
  idempotencyKey: string
  businessId: string
  customerId: string
  holdToken: string
  status: OrderStatus
  subtotalCents: number
  dueOnlineCents: number
  dueAtAppointmentCents: number
  paymentChoice: CreateOrderInput['paymentChoice']
  paymentRequest?: { status: 'PENDING'; amountCents: number; currency: 'XCD'; reference: string; provider: null } | null
  segments: Array<HoldRecord['segments'][number] & { confirmationMode: 'AUTOMATIC' | 'MANUAL'; status: SegmentStatus }>
}

export interface BookingOrderStore {
  transaction<T>(work: (store: BookingOrderStore) => Promise<T>): Promise<T>
  findByIdempotencyKey(key: string): Promise<CreatedOrder | null>
  acquireHoldLock(token: string): Promise<void>
  getActiveHold(token: string, now: Date): Promise<HoldRecord>
  getOfferings(ids: string[], businessId: string): Promise<OfferingBookingPolicy[]>
  revalidateHold(hold: HoldRecord, now: Date): Promise<void>
  create(input: Omit<CreatedOrder, 'id'>): Promise<CreatedOrder>
  consumeHoldIfActive(token: string, consumedAt: Date): Promise<boolean>
}

export async function createBookingOrder(
  input: CreateOrderInput,
  dependencies: { store: BookingOrderStore; now?: () => Date },
) {
  return dependencies.store.transaction(async (store) => {
    await store.acquireHoldLock(input.holdToken)
    const existing = await store.findByIdempotencyKey(input.idempotencyKey)
    if (existing) {
      if (existing.customerId !== input.customerId || existing.holdToken !== input.holdToken || existing.paymentChoice !== input.paymentChoice) {
        throw Object.assign(new Error('IDEMPOTENCY_KEY_REUSED'), { code: 'IDEMPOTENCY_KEY_REUSED' })
      }
      return existing
    }
    const now = dependencies.now?.() ?? new Date()
    const hold = await store.getActiveHold(input.holdToken, now)
    if (hold.customerId && hold.customerId !== input.customerId) throw Object.assign(new Error('HOLD_OWNERSHIP_MISMATCH'), { code: 'INVALID_BOOKING' })
    if (hold.expiresAt <= now || hold.consumedAt) throw Object.assign(new Error('HOLD_EXPIRED'), { code: 'HOLD_EXPIRED' })
    await store.revalidateHold(hold, now)
    const offerings = await store.getOfferings(hold.segments.map((segment) => segment.offeringId), hold.businessId)
    if (offerings.length !== new Set(hold.segments.map((segment) => segment.offeringId)).size) throw new Error('INVALID_BOOKING')
    const allowed = getAllowedPaymentChoices(offerings.map((offering) => ({ paymentChoices: [
      ...(offering.allowFullPayment ? ['FULL' as const] : []),
      ...(offering.allowDeposit ? ['DEPOSIT' as const] : []),
      ...(offering.allowCash ? ['CASH' as const] : []),
    ] })))
    if (!allowed.includes(input.paymentChoice)) throw new Error('PAYMENT_CHOICE_NOT_ALLOWED')
    const subtotalCents = hold.segments.reduce((sum, segment) => sum + segment.priceCents, 0)
    const amounts = calculateBookingPaymentAmounts({
      choice: input.paymentChoice,
      segments: hold.segments.map((segment) => {
        const offering = offerings.find((candidate) => candidate.id === segment.offeringId)!
        return { priceCents: segment.priceCents, depositKind: offering.depositKind, depositValue: offering.depositValue }
      }),
    })
    const segments = hold.segments.map((segment) => {
      const policy = offerings.find((offering) => offering.id === segment.offeringId)!
      return { ...segment, confirmationMode: policy.confirmationMode, status: (policy.confirmationMode === 'AUTOMATIC' ? 'CONFIRMED' : 'REQUESTED') as SegmentStatus }
    })
    const status: OrderStatus = input.paymentChoice === 'CASH'
      ? (segments.some((segment) => segment.status === 'REQUESTED') ? 'REQUESTED' : 'CONFIRMED')
      : 'PAYMENT_PENDING'
    const paymentRequest = amounts.dueOnlineCents > 0 ? {
      status: 'PENDING' as const,
      amountCents: amounts.dueOnlineCents,
      currency: 'XCD' as const,
      reference: `booking:${input.idempotencyKey}`,
      provider: null,
    } : null
    if (!await store.consumeHoldIfActive(hold.token, now)) throw Object.assign(new Error('HOLD_EXPIRED'), { code: 'HOLD_EXPIRED' })
    const order = await store.create({ idempotencyKey: input.idempotencyKey, holdToken: hold.token, businessId: hold.businessId, customerId: input.customerId, status, subtotalCents, dueOnlineCents: amounts.dueOnlineCents, dueAtAppointmentCents: amounts.dueAtAppointmentCents, paymentChoice: input.paymentChoice, paymentRequest, segments })
    return order
  })
}
