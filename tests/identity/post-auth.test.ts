import { describe, expect, it } from 'vitest'

import {
	buildPostAuthRedirectUrl,
	resolvePostAuthDestination,
	resolveSafePostAuthDestination,
} from '@/modules/identity/post-auth'

describe('post-auth routing', () => {
	it('sends a new customer to their Phase 2 bookings profile', () => {
		expect(resolvePostAuthDestination({ platformRole: 'USER', memberships: [] })).toBe('/profile/bookings')
	})

	it('sends administrators to the revised admin workspace', () => {
		expect(resolvePostAuthDestination({ platformRole: 'ADMIN', memberships: [{ role: 'OWNER' }] })).toBe('/admin')
	})

	it('sends owners and managers to the business calendar', () => {
		expect(resolvePostAuthDestination({ platformRole: 'USER', memberships: [{ role: 'OWNER' }] })).toBe('/business/calendar')
		expect(resolvePostAuthDestination({ platformRole: 'EMPLOYEE', memberships: [{ role: 'MANAGER' }] })).toBe('/business/calendar')
	})

	it('sends accounts memberships to finance', () => {
		expect(resolvePostAuthDestination({ platformRole: 'ACCOUNTANT', memberships: [{ role: 'ACCOUNTS' }] })).toBe('/business/finance')
	})

	it('sends staff memberships to their revised schedule', () => {
		expect(resolvePostAuthDestination({ platformRole: 'EMPLOYEE', memberships: [{ role: 'STAFF' }] })).toBe('/business/schedule')
	})

	it('preserves a staff schedule callback', () => {
		expect(resolveSafePostAuthDestination({
			callbackUrl: '/business/schedule',
			baseUrl: 'https://booktrix.test',
			fallback: '/business/schedule',
			identity: { platformRole: 'EMPLOYEE', memberships: [{ role: 'STAFF' }] },
		})).toBe('/business/schedule')
	})

	it('uses the selected workspace membership instead of aggregating roles across businesses', () => {
		const identity = {
			platformRole: 'EMPLOYEE' as const,
			memberships: [{ role: 'STAFF' as const }, { role: 'OWNER' as const }],
			selectedMembership: { role: 'STAFF' as const },
		}
		expect(resolvePostAuthDestination(identity)).toBe('/business/schedule')
		expect(resolveSafePostAuthDestination({ callbackUrl: '/business/calendar', baseUrl: 'https://booktrix.test', fallback: '/business/schedule', identity })).toBe('/business/schedule')
	})

	it('preserves a same-origin Phase 2 checkout callback', () => {
		expect(resolveSafePostAuthDestination({
		callbackUrl: 'https://booktrix.test/book/bliss?hold=abc',
		baseUrl: 'https://booktrix.test',
		fallback: '/profile/bookings',
	})).toBe('/book/bliss?hold=abc')
	})

	it('falls back instead of following an external callback URL', () => {
		expect(resolveSafePostAuthDestination({
		callbackUrl: 'https://attacker.test/collect',
		baseUrl: 'https://booktrix.test',
		fallback: '/profile/bookings',
	})).toBe('/profile/bookings')
	})

	it('falls back instead of following an encoded external callback URL', () => {
		expect(resolveSafePostAuthDestination({
			callbackUrl: '/%2F%2Fattacker.test/collect',
			baseUrl: 'https://booktrix.test',
			fallback: '/profile/bookings',
		})).toBe('/profile/bookings')
	})

	it('falls back instead of returning users to legacy or obsolete routes', () => {
		for (const callbackUrl of ['/spas', '/dashboard', '/manager', '/api/auth/redirect', '/business-private']) {
			expect(resolveSafePostAuthDestination({ callbackUrl, baseUrl: 'https://booktrix.test', fallback: '/business/calendar' })).toBe('/business/calendar')
		}
	})

	it('does not preserve an admin callback for a customer', () => {
		expect(resolveSafePostAuthDestination({
		callbackUrl: '/admin',
		baseUrl: 'https://booktrix.test',
		fallback: '/profile/bookings',
		identity: { platformRole: 'USER', memberships: [] },
	})).toBe('/profile/bookings')
	})

	it('wraps a safe callback in the role-aware redirect endpoint', () => {
		expect(buildPostAuthRedirectUrl('/for-business/apply', 'https://booktrix.test')).toBe('https://booktrix.test/api/auth/redirect?callbackUrl=%2Ffor-business%2Fapply')
	})
})
