type LegacyBusiness = { id: string; legacySpaId: string | null }
type LegacyLocation = { id: string; businessId: string }
type LegacySubservice = {
  id: string
  spaId: string
  serviceId: string
  name: string
  description: string | null
  durationMin: number
  priceCents: number
  active: boolean
}
type LegacyBooking = {
  id: string
  spaId: string
  subserviceId: string
  userId: string | null
  employeeId: string | null
  start: Date
  end: Date
  status: string
  paymentMethod: string
  paymentStatus: string
  totalCents: number
  paidCents: number
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
}

export type MarketplaceSchedulingBackfillInput = {
  businesses: LegacyBusiness[]
  locations: LegacyLocation[]
  subservices: LegacySubservice[]
  bookings: LegacyBooking[]
}

export type MarketplaceSchedulingBackfillPlan = {
  offerings: Array<{
    businessId: string
    legacySubserviceId: string
    categoryLegacyId: string
    name: string
    description: string | null
    durationMinutes: number
    priceCents: number
    active: boolean
  }>
  serviceLocations: Array<{ offeringLegacyId: string; locationId: string }>
  orders: Array<{
    businessId: string
    legacyBookingId: string
    customerId: string | null
    customerName: string | null
    customerEmail: string | null
    customerPhone: string | null
    subtotalCents: number
    paidCents: number
    paymentChoice: 'CASH' | 'FULL'
    status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  }>
  segments: Array<{
    legacyBookingId: string
    offeringLegacyId: string
    locationId: string
    legacyEmployeeId: string | null
    start: Date
    end: Date
    priceCents: number
    status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  }>
  skipped: Array<{
    legacyId: string
    kind: 'subservice' | 'booking'
    reason: 'BUSINESS_NOT_FOUND' | 'LOCATION_NOT_FOUND' | 'OFFERING_NOT_FOUND'
  }>
}

const segmentStatus = (status: string): MarketplaceSchedulingBackfillPlan['segments'][number]['status'] => {
  if (status === 'PENDING') return 'REQUESTED'
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELLED') return 'CANCELLED'
  if (status === 'NO_SHOW') return 'NO_SHOW'
  return 'CONFIRMED'
}

const orderStatus = (status: string): MarketplaceSchedulingBackfillPlan['orders'][number]['status'] => {
  const mapped = segmentStatus(status)
  if (mapped === 'NO_SHOW') return 'COMPLETED'
  return mapped
}

export function planMarketplaceSchedulingBackfill(
  input: MarketplaceSchedulingBackfillInput,
): MarketplaceSchedulingBackfillPlan {
  const businessBySpa = new Map(
    input.businesses
      .filter((business): business is LegacyBusiness & { legacySpaId: string } => Boolean(business.legacySpaId))
      .map((business) => [business.legacySpaId, business]),
  )
  const primaryLocationByBusiness = new Map<string, LegacyLocation>()
  for (const location of [...input.locations].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!primaryLocationByBusiness.has(location.businessId)) {
      primaryLocationByBusiness.set(location.businessId, location)
    }
  }

  const plan: MarketplaceSchedulingBackfillPlan = {
    offerings: [],
    serviceLocations: [],
    orders: [],
    segments: [],
    skipped: [],
  }

  const mappedOfferingIds = new Set<string>()
  for (const subservice of [...input.subservices].sort((a, b) => a.id.localeCompare(b.id))) {
    const business = businessBySpa.get(subservice.spaId)
    if (!business) {
      plan.skipped.push({ legacyId: subservice.id, kind: 'subservice', reason: 'BUSINESS_NOT_FOUND' })
      continue
    }
    const location = primaryLocationByBusiness.get(business.id)
    if (!location) {
      plan.skipped.push({ legacyId: subservice.id, kind: 'subservice', reason: 'LOCATION_NOT_FOUND' })
      continue
    }
    plan.offerings.push({
      businessId: business.id,
      legacySubserviceId: subservice.id,
      categoryLegacyId: subservice.serviceId,
      name: subservice.name,
      description: subservice.description,
      durationMinutes: subservice.durationMin,
      priceCents: subservice.priceCents,
      active: subservice.active,
    })
    plan.serviceLocations.push({ offeringLegacyId: subservice.id, locationId: location.id })
    mappedOfferingIds.add(subservice.id)
  }

  for (const booking of [...input.bookings].sort((a, b) => a.id.localeCompare(b.id))) {
    const business = businessBySpa.get(booking.spaId)
    if (!business) {
      plan.skipped.push({ legacyId: booking.id, kind: 'booking', reason: 'BUSINESS_NOT_FOUND' })
      continue
    }
    const location = primaryLocationByBusiness.get(business.id)
    if (!location) {
      plan.skipped.push({ legacyId: booking.id, kind: 'booking', reason: 'LOCATION_NOT_FOUND' })
      continue
    }
    if (!mappedOfferingIds.has(booking.subserviceId)) {
      plan.skipped.push({ legacyId: booking.id, kind: 'booking', reason: 'OFFERING_NOT_FOUND' })
      continue
    }
    plan.orders.push({
      businessId: business.id,
      legacyBookingId: booking.id,
      customerId: booking.userId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      subtotalCents: booking.totalCents,
      paidCents: booking.paidCents,
      paymentChoice: booking.paymentMethod === 'CASH' ? 'CASH' : 'FULL',
      status: orderStatus(booking.status),
    })
    plan.segments.push({
      legacyBookingId: booking.id,
      offeringLegacyId: booking.subserviceId,
      locationId: location.id,
      legacyEmployeeId: booking.employeeId,
      start: booking.start,
      end: booking.end,
      priceCents: booking.totalCents,
      status: segmentStatus(booking.status),
    })
  }

  return plan
}
