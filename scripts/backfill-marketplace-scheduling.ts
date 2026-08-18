import { prisma } from '../lib/prisma'
import { planMarketplaceSchedulingBackfill } from '../modules/bookings/legacy-backfill'

async function run() {
  const apply = process.argv.includes('--apply')
  const dryRun = process.argv.includes('--dry-run')
  if (apply === dryRun) {
    throw new Error('Choose exactly one mode: --dry-run or --apply')
  }

  const [businesses, locations, subservices, bookings, employees] = await Promise.all([
    prisma.business.findMany({ select: { id: true, legacySpaId: true } }),
    prisma.location.findMany({ select: { id: true, businessId: true } }),
    prisma.subservice.findMany({
      select: {
        id: true,
        spaId: true,
        serviceId: true,
        name: true,
        description: true,
        durationMin: true,
        priceCents: true,
        active: true,
      },
    }),
    prisma.booking.findMany({
      select: {
        id: true,
        spaId: true,
        subserviceId: true,
        userId: true,
        employeeId: true,
        start: true,
        end: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        totalCents: true,
        paidCents: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
      },
    }),
    prisma.employee.findMany({ select: { id: true, userId: true, spaId: true } }),
  ])

  const plan = planMarketplaceSchedulingBackfill({ businesses, locations, subservices, bookings })
  console.info(`${apply ? 'Applying' : 'Dry run'} marketplace scheduling backfill`)
  console.info(`- ${plan.offerings.length} offering(s)`)
  console.info(`- ${plan.orders.length} order(s)`)
  console.info(`- ${plan.skipped.length} skipped record(s)`)
  for (const skipped of plan.skipped) {
    console.info(`  ${skipped.kind} ${skipped.legacyId}: ${skipped.reason}`)
  }
  if (!apply) return

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
  await prisma.$transaction(async (tx) => {
    for (const item of plan.offerings) {
      const offering = await tx.serviceOffering.upsert({
        where: { legacySubserviceId: item.legacySubserviceId },
        update: {
          name: item.name,
          description: item.description,
          durationMinutes: item.durationMinutes,
          priceCents: item.priceCents,
          active: item.active,
        },
        create: {
          businessId: item.businessId,
          legacySubserviceId: item.legacySubserviceId,
          category: item.categoryLegacyId,
          name: item.name,
          description: item.description,
          durationMinutes: item.durationMinutes,
          priceCents: item.priceCents,
          active: item.active,
        },
      })
      const serviceLocation = plan.serviceLocations.find(
        (candidate) => candidate.offeringLegacyId === item.legacySubserviceId,
      )!
      await tx.serviceLocation.upsert({
        where: { offeringId_locationId: { offeringId: offering.id, locationId: serviceLocation.locationId } },
        update: { active: true },
        create: { offeringId: offering.id, locationId: serviceLocation.locationId },
      })
    }

    for (const item of plan.orders) {
      const order = await tx.bookingOrder.upsert({
        where: { legacyBookingId: item.legacyBookingId },
        update: { status: item.status, paidCents: item.paidCents },
        create: {
          businessId: item.businessId,
          customerId: item.customerId,
          legacyBookingId: item.legacyBookingId,
          idempotencyKey: `legacy:${item.legacyBookingId}`,
          origin: 'LEGACY',
          status: item.status,
          customerName: item.customerName,
          customerEmail: item.customerEmail,
          customerPhone: item.customerPhone,
          subtotalCents: item.subtotalCents,
          paidCents: item.paidCents,
          paymentChoice: item.paymentChoice,
          dueOnlineCents: 0,
          dueAtAppointmentCents: Math.max(0, item.subtotalCents - item.paidCents),
        },
      })
      const segment = plan.segments.find((candidate) => candidate.legacyBookingId === item.legacyBookingId)!
      const offering = await tx.serviceOffering.findUniqueOrThrow({
        where: { legacySubserviceId: segment.offeringLegacyId },
      })
      const employee = segment.legacyEmployeeId ? employeeById.get(segment.legacyEmployeeId) : null
      const membership = employee?.userId
        ? await tx.businessMembership.findUnique({
            where: { businessId_userId: { businessId: item.businessId, userId: employee.userId } },
          })
        : null
      await tx.bookingSegment.upsert({
        where: { legacyBookingId: segment.legacyBookingId },
        update: { status: segment.status, membershipId: membership?.id ?? null },
        create: {
          orderId: order.id,
          offeringId: offering.id,
          locationId: segment.locationId,
          membershipId: membership?.id ?? null,
          legacyBookingId: segment.legacyBookingId,
          startsAt: segment.start,
          endsAt: segment.end,
          occupiedStartsAt: segment.start,
          occupiedEndsAt: segment.end,
          priceCents: segment.priceCents,
          confirmationMode: segment.status === 'REQUESTED' ? 'MANUAL' : 'AUTOMATIC',
          status: segment.status,
        },
      })
    }
  })
}

run()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
