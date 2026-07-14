import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export async function requireRole(
	roles: Array<'OWNER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'USER' | 'ADMIN'>
) {
	const session = await getServerSession(authOptions)
	if (!session || !roles.includes(session.user.role as any))
		throw new Error('Forbidden')
	return session
}
