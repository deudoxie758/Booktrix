import type { CatalogPaymentChoice } from '@/modules/catalog/types'

export type OrderStatus = 'DRAFT' | 'HELD' | 'PAYMENT_PENDING' | 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'PARTIALLY_CANCELLED' | 'CANCELLED' | 'EXPIRED'
export type SegmentStatus = 'REQUESTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'NO_SHOW'
export type ConfirmationModeValue = 'AUTOMATIC' | 'MANUAL'

export type OfferingBookingPolicy = {
  id: string
  confirmationMode: ConfirmationModeValue
  allowFullPayment: boolean
  allowDeposit: boolean
  allowCash: boolean
  depositKind: 'FIXED' | 'PERCENTAGE' | null
  depositValue: number | null
}

export type CreateOrderInput = {
  holdToken: string
  customerId: string
  idempotencyKey: string
  paymentChoice: CatalogPaymentChoice
}
