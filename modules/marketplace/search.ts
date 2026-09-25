import { listPublishedOfferings } from '@/modules/catalog/repository'
import { distanceKm, parseSearchCoordinates } from './distance'

export type MarketplaceOfferingRow = {
  id: string
  businessStatus: 'PUBLISHED' | 'SUSPENDED' | string
  businessName: string
  businessSlug: string
  coverImageUrl?: string | null
  offeringName: string
  category: string
  priceCents: number
  durationMinutes: number
  locations: Array<{ name: string; address: string | null; latitude?: number | null; longitude?: number | null }>
}

export type MarketplaceResult = {
  businessName: string
  businessSlug: string
  businessStatus: string
  coverImageUrl: string | null
  startingPriceCents: number
  offerings: Array<Pick<MarketplaceOfferingRow, 'id' | 'offeringName' | 'category' | 'priceCents' | 'durationMinutes'>>
  locations: MarketplaceOfferingRow['locations']
  distanceKm?: number
}

type SearchInput = { query?: string; category?: string; district?: string; latitude?: string; longitude?: string; take?: number; skip?: number }
type SearchRepository = { list(input: SearchInput): Promise<MarketplaceOfferingRow[]> }

const databaseRepository: SearchRepository = {
  list: async (input) => {
    const rows = await listPublishedOfferings({ query: input.query, category: input.category, take: 50, skip: 0 })
    return rows.map((row) => ({
      id: row.id,
      businessStatus: row.business.status,
      businessName: row.business.name,
      businessSlug: row.business.slug,
      coverImageUrl: row.business.coverImageUrl,
      offeringName: row.name,
      category: row.category,
      priceCents: row.priceCents,
      durationMinutes: row.durationMinutes,
      locations: row.Locations.map(({ location }) => ({ name: location.name, address: location.address, latitude: location.latitude === null ? null : Number(location.latitude), longitude: location.longitude === null ? null : Number(location.longitude) })),
    }))
  },
}

export async function searchMarketplace(input: SearchInput, repository: SearchRepository = databaseRepository) {
  const normalized = {
    query: input.query?.trim() || undefined,
    category: input.category?.trim() || undefined,
    district: input.district?.trim() || undefined,
    take: Math.min(input.take ?? 24, 50),
    skip: Math.max(input.skip ?? 0, 0),
  }
  const origin = parseSearchCoordinates(input)
  const rows = (await repository.list(normalized)).filter((row) =>
    row.businessStatus === 'PUBLISHED'
    && (!normalized.district || row.locations.some((location) => location.address?.toLowerCase().includes(normalized.district!.toLowerCase()))),
  )
  const grouped = new Map<string, MarketplaceResult>()
  for (const row of rows) {
    const current = grouped.get(row.businessSlug) ?? {
      businessName: row.businessName,
      businessSlug: row.businessSlug,
      businessStatus: row.businessStatus,
      coverImageUrl: row.coverImageUrl ?? null,
      startingPriceCents: row.priceCents,
      offerings: [],
      locations: row.locations,
    }
    current.startingPriceCents = Math.min(current.startingPriceCents, row.priceCents)
    current.offerings.push({ id: row.id, offeringName: row.offeringName, category: row.category, priceCents: row.priceCents, durationMinutes: row.durationMinutes })
    grouped.set(row.businessSlug, current)
  }
  const storefronts = Array.from(grouped.values())
  if (origin) {
    for (const storefront of storefronts) {
      const distances = storefront.locations.flatMap((location) =>
        typeof location.latitude === 'number' && typeof location.longitude === 'number'
          ? [distanceKm(origin, { latitude: location.latitude, longitude: location.longitude })]
          : [],
      )
      if (distances.length) storefront.distanceKm = Math.min(...distances)
    }
  }
  storefronts.sort((left, right) => {
    if (origin) {
      const distanceOrder = (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY)
      if (distanceOrder !== 0) return distanceOrder
    } else {
      const imageOrder = Number(Boolean(right.coverImageUrl)) - Number(Boolean(left.coverImageUrl))
      if (imageOrder !== 0) return imageOrder
    }
    return left.businessName.localeCompare(right.businessName) || left.businessSlug.localeCompare(right.businessSlug)
  })
  return storefronts.slice(normalized.skip, normalized.skip + normalized.take)
}
