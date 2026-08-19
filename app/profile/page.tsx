import { redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { requireActor } from '@/modules/identity/session'
import { buildAccountHub } from '@/modules/profile/account-hub'

import { AccountHub } from './AccountHub'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const actor = await requireActor().catch(() => null)
  if (!actor) redirect('/auth/sign-in?callbackUrl=/profile')

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    include: {
      BusinessMemberships: {
        where: { active: true },
        include: { Locations: { select: { locationId: true } }, business: { include: { Locations: { where: { isActive: true }, select: { id: true } }, Memberships: { where: { active: true }, select: { id: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
      BookingOrders: {
        include: { business: true, PaymentRequest: true, Segments: { include: { offering: true, location: true, membership: { include: { user: true } } }, orderBy: { startsAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!user) redirect('/auth/sign-in?callbackUrl=/profile')

  const businessIds = user.BusinessMemberships.map((membership) => membership.businessId)
  const [businessOrders, businessCount, applicationCount] = await Promise.all([
    businessIds.length ? prisma.bookingOrder.findMany({
      where: { businessId: { in: businessIds } },
      include: { business: true, PaymentRequest: true, Segments: { include: { offering: true, location: true, membership: { include: { user: true } } } } },
      orderBy: { createdAt: 'desc' },
    }) : Promise.resolve([]),
    actor.platformRole === 'ADMIN' ? prisma.business.count() : Promise.resolve(0),
    actor.platformRole === 'ADMIN' ? prisma.businessApplication.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }) : Promise.resolve(0),
  ])

  const hub = buildAccountHub({
    now: new Date(),
    user: { id: user.id, name: user.name, email: user.email, points: user.points, role: user.role },
    memberships: user.BusinessMemberships.map((membership) => ({ id: membership.id, role: membership.role, locationIds: membership.role === 'OWNER' ? membership.business.Locations.map((location) => location.id) : membership.Locations.map((location) => location.locationId), business: { id: membership.business.id, name: membership.business.name, slug: membership.business.slug, status: membership.business.status, activeTeamCount: membership.business.Memberships.length } })),
    customerOrders: user.BookingOrders,
    businessOrders,
    platformSummary: actor.platformRole === 'ADMIN' ? { businesses: businessCount, applicationsAwaitingReview: applicationCount } : undefined,
  })

  return <AccountHub hub={hub} />
}
