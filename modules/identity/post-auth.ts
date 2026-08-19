export type PlatformRole = 'USER' | 'OWNER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'ADMIN'
export type WorkspaceRole = 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'STAFF'

type PostAuthIdentity = {
	platformRole: PlatformRole
	memberships: Array<{ role: WorkspaceRole }>
	selectedMembership?: { role: WorkspaceRole }
}

const obsoletePaths = ['/api', '/auth', '/dashboard', '/manager', '/spas', '/signup']

export function resolvePostAuthDestination({ platformRole, memberships, selectedMembership }: PostAuthIdentity) {
	if (platformRole === 'ADMIN') return '/admin'

	const role = selectedWorkspaceRole({ memberships, selectedMembership })
	if (role === 'OWNER' || role === 'MANAGER') return '/business/calendar'
	if (role === 'ACCOUNTS') return '/business/finance'
	if (role === 'STAFF') return '/business/schedule'

	return '/profile'
}

export function resolveSafePostAuthDestination({ callbackUrl, baseUrl, fallback, identity }: { callbackUrl: string | null | undefined; baseUrl: string; fallback: string; identity?: PostAuthIdentity }) {
	if (!callbackUrl) return fallback

	try {
		const base = new URL(baseUrl)
		const candidate = new URL(callbackUrl, base)
		if (candidate.origin !== base.origin || !isRevisedPath(candidate.pathname) || (identity && !canUsePostAuthPath(candidate.pathname, identity))) return fallback
		return `${candidate.pathname}${candidate.search}`
	} catch {
		return fallback
	}
}

export function buildPostAuthRedirectUrl(callbackUrl: string | null | undefined, baseUrl: string) {
	const redirectUrl = new URL('/api/auth/redirect', baseUrl)
	const destination = resolveSafePostAuthDestination({ callbackUrl, baseUrl, fallback: '' })
	if (destination) redirectUrl.searchParams.set('callbackUrl', destination)
	return redirectUrl.toString()
}

function isRevisedPath(pathname: string) {
	if (obsoletePaths.some((path) => pathMatches(pathname, path))) return false
	return pathname === '/' || ['/search', '/s', '/book', '/profile', '/for-business', '/business', '/admin'].some((path) => pathMatches(pathname, path))
}

function canUsePostAuthPath(pathname: string, { platformRole, memberships, selectedMembership }: PostAuthIdentity) {
	if (pathname === '/' || ['/search', '/s', '/book', '/profile', '/for-business'].some((path) => pathMatches(pathname, path))) return true
	if (pathMatches(pathname, '/admin')) return platformRole === 'ADMIN'

	const role = selectedWorkspaceRole({ memberships, selectedMembership })
	if (role === 'OWNER') return pathMatches(pathname, '/business')
	if (role === 'MANAGER') return pathname === '/business' || ['/business/calendar', '/business/customers', '/business/services', '/business/locations'].some((path) => pathMatches(pathname, path))
	if (role === 'ACCOUNTS') return pathname === '/business' || ['/business/finance', '/business/locations'].some((path) => pathMatches(pathname, path))
	if (role === 'STAFF') return pathname === '/business' || ['/business/schedule', '/business/customers'].some((path) => pathMatches(pathname, path))
	return false
}

function selectedWorkspaceRole({ memberships, selectedMembership }: Pick<PostAuthIdentity, 'memberships' | 'selectedMembership'>) {
	return selectedMembership?.role ?? memberships[0]?.role
}

function pathMatches(pathname: string, path: string) {
	return pathname === path || pathname.startsWith(`${path}/`)
}
