import { calculatePaymentAmounts, getAllowedPaymentChoices } from '@/modules/catalog/payment-options'
import type { HoldRecord } from '@/modules/scheduling/holds'

import type { CreateOrderInput, OfferingBookingPolicy, OrderStatus, SegmentStatus } from './types'

type CreatedOrder = {
  id: string
  idempotencyKey: string
  businessId: string
  customerId: string
  status: OrderStatus
  subtotalCents: number
  dueOnlineCents: number
  dueAtAppointmentCents: number
  paymentChoice: CreateOrderInput['paymentChoice']
  segments: Array<HoldRecord['segments'][number] & { confirmationMode: 'AUTOMATIC' | 'MANUAL'; status: SegmentStatus }>
}

export interface BookingOrderStore {
  transaction<T>(work: () => Promise<T>): Promise<T>
  findByIdempotencyKey(key: string): Promise<CreatedOrder | null>
  getActiveHold(token: string, now: Date): Promise<HoldRecord>
  getOfferings(ids: string[]): Promise<OfferingBookingPolicy[]>
  create(input: Omit<CreatedOrder, 'id'>): Promise<CreatedOrder>
  consumeHold(token: string, consumedAt: Date): Promise<void>
}

export async function createBookingOrder(
  input: CreateOrderInput,
  dependencies: { store: BookingOrderStore; now?: () => Date },
) {
  return dependencies.store.transaction(async () => {
    const existing = await dependencies.store.findByIdempotencyKey(input.idempotencyKey)
    if (existing) return existing
    const now = dependencies.now?.() ?? new Date()
    const hold = await dependencies.store.getActiveHold(input.holdToken, now)
    if (hold.customerId && hold.customerId !== input.customerId) throw Object.assign(new Error('HOLD_OWNERSHIP_MISMATCH'), { code: 'INVALID_BOOKING' })
    if (hold.expiresAt <= now || hold.consumedAt) throw Object.assign(new Error('HOLD_EXPIRED'), { code: 'HOLD_EXPIRED' })
    const offerings = await dependencies.store.getOfferings(hold.segments.map((segment) => segment.offeringId))
    if (offerings.length !== hold.segments.length) throw new Error('INVALID_BOOKING')
    const allowed = getAllowedPaymentChoices(offerings.map((offering) => ({ paymentChoices: [
      ...(offering.allowFullPayment ? ['FULL' as const] : []),
      ...(offering.allowDeposit ? ['DEPOSIT' as const] : []),
      ...(offering.allowCash ? ['CASH' as const] : []),
    ] })))
    if (!allowed.includes(input.paymentChoice)) throw new Error('PAYMENT_CHOICE_NOT_ALLOWED')
    const subtotalCents = hold.segments.reduce((sum, segment) => sum + segment.priceCents, 0)
    const depositOffering = offerings.find((offering) => offering.depositKind && offering.depositValue != null)
    const amounts = calculatePaymentAmounts({ subtotalCents, choice: input.paymentChoice, depositKind: depositOffering?.depositKind, depositValue: depositOffering?.depositValue })
    const segments = hold.segments.map((segment) => {
      const policy = offerings.find((offering) => offering.id === segment.offeringId)!
      return { ...segment, confirmationMode: policy.confirmationMode, status: (policy.confirmationMode === 'AUTOMATIC' ? 'CONFIRMED' : 'REQUESTED') as SegmentStatus }
    })
    const status: OrderStatus = segments.some((segment) => segment.status === 'REQUESTED') ? 'REQUESTED' : 'CONFIRMED'
    const order = await dependencies.store.create({ idempotencyKey: input.idempotencyKey, businessId: hold.businessId, customerId: input.customerId, status, subtotalCents, dueOnlineCents: amounts.dueOnlineCents, dueAtAppointmentCents: amounts.dueAtAppointmentCents, paymentChoice: input.paymentChoice, segments })
    await dependencies.store.consumeHold(hold.token, now)
    return order
  })
}
