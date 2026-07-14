import 'next-auth'

declare module 'next-auth' {
	interface Session {
		user: {
			id: string
			role: 'USER' | 'OWNER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'ADMIN'
			name?: string | null
			email?: string | null
			image?: string | null
		}
	}

	interface User {
		id: string
		role: 'USER' | 'OWNER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'ADMIN'
		name?: string | null
		email?: string | null
		image?: string | null
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		sub?: string
		role?: 'USER' | 'OWNER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'ADMIN'
	}
}
