import { redirect } from 'next/navigation'
import { canonicalLegacyBookingUrl, resolveLegacyOfferingId } from '@/lib/legacy-booking'
import { prisma } from '@/lib/prisma'

export default async function BookPage({
	params,
	searchParams,
}: {
	params: { slug: string }
	searchParams: { service?: string }
}) {
	const offeringId = await resolveLegacyOfferingId(params.slug, searchParams.service, async ({ slug, legacyServiceId }) => {
		const offering = await prisma.serviceOffering.findFirst({
			where: {
				business: { slug },
				active: true,
				OR: [{ legacySubserviceId: legacyServiceId }, { id: legacyServiceId }],
			},
			select: { id: true },
		})
		return offering?.id ?? null
	})
	redirect(canonicalLegacyBookingUrl(params.slug, offeringId))
}
