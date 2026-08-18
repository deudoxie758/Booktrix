import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
	function middleware(req) {
		const token = req.nextauth.token
		const path = req.nextUrl.pathname

		// Redirect OWNER and EMPLOYEE to manager dashboard after login
		if (
			path === '/dashboard' &&
			token?.role &&
			['OWNER', 'EMPLOYEE'].includes(token.role as string)
		) {
			return NextResponse.redirect(new URL('/manager', req.url))
		}

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
