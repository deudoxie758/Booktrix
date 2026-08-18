import { prisma } from '@/lib/prisma'

import type { PublishedOfferingFilters } from './types'

export function listPublishedOfferings(filters: PublishedOfferingFilters = {}) {
  const query = filters.query?.trim()
  return prisma.serviceOffering.findMany({
    where: {
      active: true,
      business: { status: 'PUBLISHED' },
      category: filters.category,
      priceCents: {
        gte: filters.minimumPriceCents,
        lte: filters.maximumPriceCents,
      },
      OR: query
        ? [
            { name: { contains: query } },
            { category: { contains: query } },
            { business: { name: { contains: query } } },
          ]
        : undefined,
      Locations: {
        some: {
          active: true,
          locationId: filters.locationId,
          location: { isActive: true },
        },
      },
    },
    include: {
      business: { select: { id: true, name: true, slug: true, status: true } },
      Locations: {
        where: { active: true, location: { isActive: true } },
        include: { location: true },
      },
    },
    orderBy: [{ business: { name: 'asc' } }, { name: 'asc' }],
    take: Math.min(filters.take ?? 24, 50),
    skip: filters.skip ?? 0,
  })
}
