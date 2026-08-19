export function canonicalLegacyBookingUrl(slug: string, service?: string) {
  const base = `/book/${encodeURIComponent(slug)}`
  if (!service) return base
  const query = new URLSearchParams({ services: service })
  return `${base}?${query}`
}

type LegacyOfferingLookup = (input: { slug: string; legacyServiceId: string }) => Promise<string | null>

export async function resolveLegacyOfferingId(slug: string, legacyServiceId: string | undefined, lookup: LegacyOfferingLookup) {
  if (!legacyServiceId) return undefined
  return (await lookup({ slug, legacyServiceId })) ?? undefined
}
