import { prisma } from '../lib/prisma'
import { toLegacyOrganization } from '../modules/organizations/legacy-backfill'

async function run() {
	const apply = process.argv.includes('--apply')
	const spas = await prisma.spa.findMany({ include: { Employees: true } })

	console.info(`${apply ? 'Applying' : 'Dry run:'} ${spas.length} legacy storefront(s)`)

	for (const spa of spas) {
		const mapped = toLegacyOrganization(spa)
		const slugOwner = await prisma.business.findUnique({ where: { slug: mapped.business.slug } })
		if (slugOwner && slugOwner.legacySpaId !== spa.id) {
			throw new Error(`Business slug collision: ${mapped.business.slug}`)
		}

		console.info(`- ${spa.name}: 1 location, ${mapped.memberships.length} membership(s)`)
		if (!apply) continue

		await prisma.$transaction(async (tx) => {
			const business = await tx.business.upsert({
				where: { legacySpaId: spa.id },
				update: { name: mapped.business.name },
				create: mapped.business,
			})
			const location = await tx.location.upsert({
				where: { businessId_slug: { businessId: business.id, slug: mapped.location.slug } },
				update: mapped.location,
				create: { businessId: business.id, ...mapped.location },
			})

			await tx.businessSetup.upsert({
				where: { businessId: business.id },
				update: {},
				create: { businessId: business.id, profileComplete: true, firstLocationComplete: true },
			})

			for (const item of mapped.memberships) {
				const membership = await tx.businessMembership.upsert({
					where: { businessId_userId: { businessId: business.id, userId: item.userId } },
					update: { role: item.role, active: true },
					create: { businessId: business.id, userId: item.userId, role: item.role },
				})
				await tx.locationAssignment.upsert({
					where: { membershipId_locationId: { membershipId: membership.id, locationId: location.id } },
					update: {},
					create: { membershipId: membership.id, locationId: location.id },
				})
			}
		})
	}
}

run()
	.catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
