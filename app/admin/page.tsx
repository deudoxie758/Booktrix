import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminPanel from './AdminPanel'

export default async function AdminPage() {
	const session = await getServerSession(authOptions)
	const role = (session?.user as any)?.role

	if (!session?.user || role !== 'ADMIN') {
		redirect('/auth/sign-in')
	}

	return <AdminPanel userRole={role} />
}
