export type PlatformRole = 'USER' | 'OWNER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'ADMIN'
export type WorkspaceRole = 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'STAFF'

type PostAuthIdentity = {
	platformRole: PlatformRole
	memberships: Array<{ role: WorkspaceRole }>
}

const obsoletePaths = ['/api', '/auth', '/dashboard', '/manager', '/spas', '/signup']

export function resolvePostAuthDestination({ platformRole, memberships }: PostAuthIdentity) {
	if (platformRole === 'ADMIN') return '/admin'

	const roles = new Set(memberships.map(({ role }) => role))
	if (roles.has('OWNER') || roles.has('MANAGER')) return '/business/calendar'
	if (roles.has('ACCOUNTS')) return '/business/finance'
	if (roles.has('STAFF')) return '/business/schedule'

	return '/profile/bookings'
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
	return pathname === '/' || ['/search', '/s', '/book', '/profile/bookings', '/for-business', '/business', '/admin'].some((path) => pathMatches(pathname, path))
}

function canUsePostAuthPath(pathname: string, { platformRole, memberships }: PostAuthIdentity) {
	if (pathname === '/' || ['/search', '/s', '/book', '/profile/bookings', '/for-business'].some((path) => pathMatches(pathname, path))) return true
	if (pathMatches(pathname, '/admin')) return platformRole === 'ADMIN'

	const roles = new Set(memberships.map(({ role }) => role))
	if (roles.has('OWNER')) return pathMatches(pathname, '/business')
	if (roles.has('MANAGER')) return ['/business', '/business/calendar', '/business/customers', '/business/services', '/business/locations'].some((path) => pathMatches(pathname, path))
	if (roles.has('ACCOUNTS')) return ['/business', '/business/finance', '/business/locations'].some((path) => pathMatches(pathname, path))
	if (roles.has('STAFF')) return ['/business', '/business/schedule', '/business/customers'].some((path) => pathMatches(pathname, path))
	return false
}

function pathMatches(pathname: string, path: string) {
	return pathname === path || pathname.startsWith(`${path}/`)
}
