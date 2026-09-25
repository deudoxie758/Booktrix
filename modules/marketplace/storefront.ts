import { prisma } from '@/lib/prisma'

export function getPublishedStorefront(slug: string) {
  return prisma.business.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      Policy: true,
      Locations: { where: { isActive: true }, orderBy: { name: 'asc' } },
      ServiceOfferings: {
        where: { active: true, Locations: { some: { active: true, location: { isActive: true } } } },
        include: { Qualifications: { where: { active: true }, include: { membership: { include: { user: true } } } }, IntakeTemplates: { include: { template: { include: { Questions: { orderBy: { sortOrder: 'asc' } } } } } } },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      },
    },
  })
}

export async function getCurrentStorefrontSlug(previousSlug: string) {
  const redirect = await prisma.storefrontSlugRedirect.findUnique({ where: { oldSlug: previousSlug }, include: { business: { select: { slug: true, status: true } } } })
  return redirect?.business.status === 'PUBLISHED' ? redirect.business.slug : null
}
