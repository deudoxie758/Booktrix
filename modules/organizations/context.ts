import { prisma } from '@/lib/prisma'
import type { BusinessRole } from '@prisma/client'
import { requireActor } from '@/modules/identity/session'

type ContextCandidate = { businessId: string; active: boolean; locationIds: string[] }

export function selectAuthorizedContext(candidates: ContextCandidate[], requestedBusinessId?: string, requestedLocationId?: string) {
	const active = candidates.filter((item) => item.active)
	const membership = requestedBusinessId ? active.find((item) => item.businessId === requestedBusinessId) : active[0]
	if (!membership) throw new Error('BUSINESS_ACCESS_DENIED')
	const locationId = requestedLocationId ?? membership.locationIds[0] ?? null
	if (locationId && !membership.locationIds.includes(locationId)) throw new Error('LOCATION_ACCESS_DENIED')
	return { businessId: membership.businessId, locationId }
}

export async function resolveBusinessContext(actorId: string, requestedBusinessId?: string, requestedLocationId?: string) {
	const memberships = await prisma.businessMembership.findMany({
		where: { userId: actorId, active: true },
		include: { business: { include: { Setup: true, Locations: { where: { isActive: true }, orderBy: { name: 'asc' } } } }, Locations: true },
		orderBy: { createdAt: 'asc' },
	})
	if (!memberships.length) throw new Error('BUSINESS_ACCESS_DENIED')
	const candidates = memberships.map((membership) => ({
		businessId: membership.businessId, active: membership.active,
		locationIds: membership.role === 'OWNER' ? membership.business.Locations.map(({ id }) => id) : membership.Locations.map(({ locationId }) => locationId),
	}))
	const selected = selectAuthorizedContext(candidates, requestedBusinessId, requestedLocationId)
	const membership = memberships.find((item) => item.businessId === selected.businessId)!
	return { business: membership.business, membership, availableLocations: membership.business.Locations.filter((location) => candidates.find((item) => item.businessId === membership.businessId)?.locationIds.includes(location.id)), activeLocation: membership.business.Locations.find((location) => location.id === selected.locationId) ?? null }
}

export async function requireWorkspaceRole(allowed: BusinessRole[]) {
	const actor = await requireActor()
	const context = await resolveBusinessContext(actor.id)
	if (!allowed.includes(context.membership.role)) throw new Error('BUSINESS_ACCESS_DENIED')
	return { actor, ...context }
}
