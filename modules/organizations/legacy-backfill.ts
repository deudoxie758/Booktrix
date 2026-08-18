import type { BusinessRole, BusinessStatus, Prisma } from '@prisma/client'

export type LegacySpaRecord = {
	id: string
	ownerId: string
	name: string
	slug: string
	address: string | null
	phone: string | null
	email: string | null
	businessHours: Prisma.JsonValue
	Employees: Array<{ userId: string | null }>
}

export function toLegacyOrganization(spa: LegacySpaRecord) {
	const staffUserIds = spa.Employees.flatMap((employee) =>
		employee.userId && employee.userId !== spa.ownerId ? [employee.userId] : [],
	)

	return {
		business: {
			name: spa.name,
			slug: spa.slug,
			status: 'SETUP' as BusinessStatus,
			defaultCurrency: 'XCD',
			legacySpaId: spa.id,
		},
		location: {
			name: spa.name,
			slug: 'main',
			address: spa.address,
			phone: spa.phone,
			email: spa.email,
			businessHours: spa.businessHours,
		},
		memberships: [
			{ userId: spa.ownerId, role: 'OWNER' as BusinessRole },
			...staffUserIds.map((userId) => ({ userId, role: 'STAFF' as BusinessRole })),
		],
	}
}
