import { describe, expect, it } from 'vitest'
import { canAccessLocation, canAccessBusiness } from '@/modules/organizations/access'

describe('business access', () => {
	it('allows active owners and denies inactive memberships', () => {
		expect(canAccessBusiness({ role: 'OWNER', active: true, assignedLocationIds: [] })).toBe(true)
		expect(canAccessBusiness({ role: 'OWNER', active: false, assignedLocationIds: [] })).toBe(false)
	})
})

describe('location access', () => {
	it('allows an owner across their business', () => {
		expect(canAccessLocation({ role: 'OWNER', active: true, assignedLocationIds: [] }, 'loc-2')).toBe(true)
	})

	it('denies a manager outside assigned locations', () => {
		expect(canAccessLocation({ role: 'MANAGER', active: true, assignedLocationIds: ['loc-1'] }, 'loc-2')).toBe(false)
	})

	it('denies accounts users operational staff mutation', () => {
		expect(
			canAccessLocation(
				{ role: 'ACCOUNTS', active: true, assignedLocationIds: ['loc-1'] },
				'loc-1',
				['OWNER', 'MANAGER'],
			),
		).toBe(false)
	})
})
