import { listPublishedOfferings } from '@/modules/catalog/repository'

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
  locations: Array<{ name: string; address: string | null }>
}

export type MarketplaceResult = {
  businessName: string
  businessSlug: string
  businessStatus: string
  coverImageUrl: string | null
  startingPriceCents: number
  offerings: Array<Pick<MarketplaceOfferingRow, 'id' | 'offeringName' | 'category' | 'priceCents' | 'durationMinutes'>>
  locations: MarketplaceOfferingRow['locations']
}

type SearchInput = { query?: string; category?: string; district?: string; take?: number; skip?: number }
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
      locations: row.Locations.map(({ location }) => ({ name: location.name, address: location.address })),
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
  return Array.from(grouped.values()).slice(normalized.skip, normalized.skip + normalized.take)
}
