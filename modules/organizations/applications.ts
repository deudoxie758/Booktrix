import { prisma } from '@/lib/prisma'
import { requirePlatformAdmin } from './access'
import { businessApplicationSchema, type BusinessApplicationInput } from './application-schema'
import { createOrganizationAudit } from './audit'

function applicationSlug(name: string, applicantId: string) {
	const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
	return `${base || 'business'}-${applicantId.slice(-6).toLowerCase()}`
}

export async function submitBusinessApplication(raw: BusinessApplicationInput, applicantId: string) {
	const input = businessApplicationSchema.parse(raw)
	const existing = await prisma.businessApplication.findFirst({
		where: { applicantId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] } },
	})
	if (existing) throw Object.assign(new Error('An active application already exists'), { code: 'APPLICATION_EXISTS' })

	return prisma.$transaction(async (tx) => {
		const business = await tx.business.create({
			data: { name: input.businessName, slug: applicationSlug(input.businessName, applicantId), status: 'UNDER_REVIEW' },
		})
		await tx.businessMembership.create({ data: { businessId: business.id, userId: applicantId, role: 'OWNER' } })
		await tx.businessSetup.create({ data: { businessId: business.id } })
		const application = await tx.businessApplication.create({
			data: {
				businessId: business.id, applicantId, status: 'SUBMITTED', ownerName: input.ownerName,
				email: input.email, phone: input.phone, address: input.address, industry: input.industry,
				serviceSummary: input.serviceSummary, submittedAt: new Date(),
			},
		})
		await createOrganizationAudit(tx, {
			businessId: business.id, actorId: applicantId, actorRole: 'USER', action: 'BUSINESS_APPLICATION_SUBMITTED',
		})
		return application
	})
}

export async function reviewBusinessApplication(input: { applicationId: string; decision: 'APPROVED' | 'REJECTED'; note: string }) {
	const admin = await requirePlatformAdmin()
	return prisma.$transaction(async (tx) => {
		const application = await tx.businessApplication.findUniqueOrThrow({ where: { id: input.applicationId } })
		if (!['SUBMITTED', 'UNDER_REVIEW'].includes(application.status)) {
			throw Object.assign(new Error('Application has already been decided'), { code: 'APPLICATION_ALREADY_DECIDED' })
		}
		const applicationUpdate = await tx.businessApplication.update({
			where: { id: input.applicationId },
			data: { status: input.decision, decisionNote: input.note.trim(), reviewerId: admin.id, reviewedAt: new Date() },
		})
		const business = await tx.business.update({
			where: { id: application.businessId }, data: { status: input.decision === 'APPROVED' ? 'SETUP' : 'REJECTED' },
		})
		const audit = await createOrganizationAudit(tx, {
			businessId: business.id, actorId: admin.id, actorRole: admin.platformRole,
			action: `BUSINESS_APPLICATION_${input.decision}`, details: { applicationId: application.id, note: input.note.trim() },
		})
		return { application: applicationUpdate, business, audit }
	})
}
