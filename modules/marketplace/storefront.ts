import { prisma } from '@/lib/prisma'

export function getPublishedStorefront(slug: string) {
  return prisma.business.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      Locations: { where: { isActive: true }, orderBy: { name: 'asc' } },
      ServiceOfferings: {
        where: { active: true, Locations: { some: { active: true, location: { isActive: true } } } },
        include: { Qualifications: { where: { active: true }, include: { membership: { include: { user: true } } } } },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      },
    },
  })
}
