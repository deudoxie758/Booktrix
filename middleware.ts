import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
	function middleware(req) {
		const path = req.nextUrl.pathname

		// Legacy role pages cannot determine contextual Phase 2 membership access.
		if (path === '/dashboard' || path === '/manager' || path.startsWith('/manager/')) return NextResponse.redirect(new URL('/api/auth/redirect', req.url))

		return NextResponse.next()
	},
	{
		callbacks: {
			authorized: ({ token }) => !!token,
		},
		pages: {
			signIn: '/auth/sign-in',
		},
	}
)

export const config = {
	matcher: [
		'/admin/:path*',
		'/business/:path*',
		'/dashboard/:path*',
		'/profile/:path*',
		'/manager/:path*',
		'/s/:path*/book/:path*',
	],
}
