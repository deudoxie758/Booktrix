import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function GET() {
	const session = await getServerSession(authOptions)

	if (!session?.user) {
		redirect('/auth/sign-in')
	}

	const role = (session.user as any).role

	if (role === 'ADMIN') {
		redirect('/admin')
	}

	if (role === 'OWNER' || role === 'EMPLOYEE') {
		redirect('/manager')
	}

	redirect('/dashboard')
}
