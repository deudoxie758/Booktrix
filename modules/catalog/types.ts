export type CatalogPaymentChoice = 'FULL' | 'DEPOSIT' | 'CASH'
export type CatalogDepositKind = 'FIXED' | 'PERCENTAGE'

export type PriceBreakdown = {
  unitPriceCents: number
  attendeeCount: number
  totalCents: number
  currency: 'XCD'
}

export type PaymentAmounts = {
  dueOnlineCents: number
  dueAtAppointmentCents: number
}

export type PublishedOfferingFilters = {
  query?: string
  category?: string
  locationId?: string
  minimumPriceCents?: number
  maximumPriceCents?: number
  take?: number
  skip?: number
}
