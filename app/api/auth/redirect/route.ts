import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { resolvePostAuthDestination, resolveSafePostAuthDestination } from '@/modules/identity/post-auth'

export async function GET(req: Request) {
	const session = await getServerSession(authOptions)

	if (!session?.user) {
		redirect('/auth/sign-in')
	}

	const memberships = await prisma.businessMembership.findMany({
		where: { userId: session.user.id, active: true },
		select: { role: true },
	})
	const fallback = resolvePostAuthDestination({
		platformRole: session.user.role,
		memberships,
	})
	const callbackUrl = new URL(req.url).searchParams.get('callbackUrl')
	redirect(resolveSafePostAuthDestination({
		callbackUrl,
		baseUrl: req.url,
		fallback,
		identity: { platformRole: session.user.role, memberships },
	}))
}
