import type { BusinessStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { Actor } from '@/modules/identity/session'
import { requireBusinessAccess } from './access'
import { createOrganizationAudit } from './audit'

const transitions: Record<BusinessStatus, BusinessStatus[]> = {
	APPLICATION: ['UNDER_REVIEW', 'ARCHIVED'],
	UNDER_REVIEW: ['APPROVED', 'REJECTED'],
	APPROVED: ['SETUP'],
	SETUP: ['PUBLISHED'],
	PUBLISHED: ['SUSPENDED', 'ARCHIVED'],
	SUSPENDED: ['PUBLISHED', 'ARCHIVED'],
	REJECTED: ['ARCHIVED'],
	ARCHIVED: [],
}

export function canTransitionBusiness(from: BusinessStatus, to: BusinessStatus) {
	return transitions[from].includes(to)
}

export type SetupReadiness = {
	profileComplete: boolean
	firstLocationComplete: boolean
	policiesAccepted: boolean
	publicationReady: boolean
}

export function isBusinessSetupReady(setup: SetupReadiness) {
	return setup.profileComplete && setup.firstLocationComplete && setup.policiesAccepted && setup.publicationReady
}

export async function completeSetupStep(
	input: { businessId: string; step: keyof SetupReadiness; complete: boolean },
	actor: Actor,
) {
	await requireBusinessAccess(input.businessId, ['OWNER'])
	return prisma.$transaction(async (tx) => {
		const setup = await tx.businessSetup.upsert({
			where: { businessId: input.businessId },
			create: { businessId: input.businessId, [input.step]: input.complete },
			update: { [input.step]: input.complete },
		})
		await createOrganizationAudit(tx, {
			businessId: input.businessId, actorId: actor.id, actorRole: actor.platformRole,
			action: 'BUSINESS_SETUP_UPDATED', details: { step: input.step, complete: input.complete },
		})
		return setup
	})
}

export async function publishBusiness(businessId: string, actor: Actor) {
	await requireBusinessAccess(businessId, ['OWNER'])
	return prisma.$transaction(async (tx) => {
		const business = await tx.business.findUniqueOrThrow({ where: { id: businessId }, include: { Setup: true } })
		if (business.status !== 'SETUP' || !business.Setup || !isBusinessSetupReady(business.Setup)) {
			throw Object.assign(new Error('Business setup is incomplete'), { code: 'BUSINESS_NOT_READY' })
		}
		const updated = await tx.business.update({ where: { id: businessId }, data: { status: 'PUBLISHED' } })
		await createOrganizationAudit(tx, {
			businessId, actorId: actor.id, actorRole: actor.platformRole, action: 'BUSINESS_PUBLISHED',
		})
		return updated
	})
}
