import type { BusinessRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AccessDeniedError, requireActor } from '@/modules/identity/session'

export type MembershipAccess = {
	role: BusinessRole
	active: boolean
	assignedLocationIds: string[]
}

export function canAccessBusiness(access: MembershipAccess, allowed?: BusinessRole[]): boolean {
	return access.active && (!allowed || allowed.includes(access.role))
}

export function canAccessLocation(
	access: MembershipAccess,
	locationId: string,
	allowed?: BusinessRole[],
): boolean {
	if (!canAccessBusiness(access, allowed)) return false
	return access.role === 'OWNER' || access.assignedLocationIds.includes(locationId)
}

export async function requirePlatformAdmin() {
	const actor = await requireActor()
	if (actor.platformRole !== 'ADMIN') throw new AccessDeniedError('PLATFORM_ADMIN_REQUIRED')
	return actor
}

export async function requireBusinessAccess(businessId: string, allowed?: BusinessRole[]) {
	const actor = await requireActor()
	const membership = await prisma.businessMembership.findUnique({
		where: { businessId_userId: { businessId, userId: actor.id } },
		include: { Locations: { select: { locationId: true } } },
	})
	if (!membership) throw new AccessDeniedError('BUSINESS_ACCESS_DENIED')

	const access: MembershipAccess = {
		role: membership.role,
		active: membership.active,
		assignedLocationIds: membership.Locations.map(({ locationId }) => locationId),
	}
	if (!canAccessBusiness(access, allowed)) throw new AccessDeniedError('BUSINESS_ACCESS_DENIED')
	return { actor, membership, access }
}

export async function requireLocationAccess(locationId: string, allowed?: BusinessRole[]) {
	const location = await prisma.location.findUnique({ select: { businessId: true }, where: { id: locationId } })
	if (!location) throw new AccessDeniedError('LOCATION_ACCESS_DENIED')
	const context = await requireBusinessAccess(location.businessId, allowed)
	if (!canAccessLocation(context.access, locationId, allowed)) throw new AccessDeniedError('LOCATION_ACCESS_DENIED')
	return { ...context, locationId, businessId: location.businessId }
}
