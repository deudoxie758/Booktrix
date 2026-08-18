import type { Role } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export type Actor = {
	id: string
	email: string | null
	name: string | null
	platformRole: Role
}

export async function getActor(): Promise<Actor | null> {
	const session = await getServerSession(authOptions)
	if (!session?.user?.id) return null

	return {
		id: session.user.id,
		email: session.user.email ?? null,
		name: session.user.name ?? null,
		platformRole: session.user.role,
	}
}

export async function requireActor(): Promise<Actor> {
	const actor = await getActor()
	if (!actor) throw new AccessDeniedError('AUTHENTICATION_REQUIRED')
	return actor
}

export class AccessDeniedError extends Error {
	constructor(public readonly code: 'AUTHENTICATION_REQUIRED' | 'PLATFORM_ADMIN_REQUIRED' | 'BUSINESS_ACCESS_DENIED' | 'LOCATION_ACCESS_DENIED') {
		super(code)
		this.name = 'AccessDeniedError'
	}
}
