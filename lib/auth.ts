import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'
import { compare } from 'bcryptjs'
import { buildPostAuthRedirectUrl } from '@/modules/identity/post-auth'

export const authOptions: NextAuthOptions = {
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID || '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
		}),
		Credentials({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(creds) {
				if (!creds?.email || !creds.password) return null
				const user = await prisma.user.findUnique({
					where: { email: creds.email },
				})
				if (!user || !user.hashedPassword) return null
				const ok = await compare(creds.password, user.hashedPassword)
				if (!ok) return null
				return {
					id: user.id,
					name: user.name ?? user.email,
					email: user.email,
					role: user.role,
				} as any
			},
		}),
	],
	session: { 
		strategy: 'jwt',
		maxAge: 24 * 60 * 60, // 24 hours
	},
	// cookies: {
	// 	sessionToken: {
	// 		name: `next-auth.session-token`,
	// 		options: {
	// 			httpOnly: true,
	// 			secure: process.env.NODE_ENV === 'production',
	// 			sameSite: 'lax',
	// 			maxAge: undefined, // Session cookie - expires when browser closes
	// 			path: '/',
	// 		},
	// 	},
	// },
	secret: process.env.NEXTAUTH_SECRET,
	
	pages:{
	signIn:"/auth/sign-in",
	signOut:"/join-us"
	},

	callbacks: {
		async redirect({ url, baseUrl }) {
			const candidate = new URL(url, baseUrl)
			if (candidate.origin === new URL(baseUrl).origin && (candidate.pathname === '/api/auth/redirect' || candidate.pathname === '/join-us')) return candidate.toString()
			return buildPostAuthRedirectUrl(url, baseUrl)
		},
		/**
		 * BUG FIX: On Google sign-in, `user` object doesn't carry `role`
		 * because it comes from the OAuth provider, not our DB.
		 * We must look up the DB user to get the correct role.
		 *
		 * Also handles first-time Google sign-in: upserts the user so they
		 * always have a DB record with a role.
		 */
		async jwt({ token, user, account }) {
			if (user) {
				// Credentials provider: role is already on user
				if ((user as any).role) {
					token.role = (user as any).role
				}
			}

			// On every sign-in (both providers), sync role from DB
			if (account) {
				if (!token.email) return token

				// Upsert: create user record for Google sign-ins if not exists
				const dbUser = await prisma.user.upsert({
					where: { email: token.email },
					create: {
						email: token.email,
						name: token.name ?? token.email,
						role: 'USER',
					},
					update: {}, // don't overwrite anything on subsequent logins
					select: { id: true, role: true },
				})

				token.sub = dbUser.id
				token.role = dbUser.role
			}

			return token
		},
		async session({ session, token }) {
			if (!session.user || !token.sub || !token.role) return session
			session.user.id = token.sub
			session.user.role = token.role
			return session
		},
	},
	// pages: {
	// 	signOut: '/join-us',
	// },
}
