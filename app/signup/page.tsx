import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
	const session = await getServerSession(authOptions)

	if (!session) {
		redirect('/join-us')
	}

	const role = (session.user as any)?.role
	if (role === 'ADMIN') {
		redirect('/admin')
	}

	redirect('/dashboard')
}
