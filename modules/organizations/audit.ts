import type { Prisma, Role } from '@prisma/client'

export async function createOrganizationAudit(
	tx: Prisma.TransactionClient,
	input: { businessId: string; actorId: string; actorRole: Role; action: string; details?: Prisma.InputJsonValue },
) {
	return tx.auditLog.create({
		data: {
			actorId: input.actorId,
			actorRole: input.actorRole,
			action: input.action,
			details: { businessId: input.businessId, ...(input.details && typeof input.details === 'object' ? input.details : {}) },
		},
	})
}
