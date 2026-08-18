import type { Role } from '@prisma/client'
import { requireActor } from '@/modules/identity/session'

export { requireBusinessAccess, requireLocationAccess, requirePlatformAdmin } from '@/modules/organizations/access'

export async function requireRole(
	roles: Role[],
) {
	const actor = await requireActor()
	if (!roles.includes(actor.platformRole)) throw new Error('Forbidden')
	return actor
}
