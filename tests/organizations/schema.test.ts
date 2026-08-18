import { BusinessRole, BusinessStatus, ApplicationStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'

describe('organization schema', () => {
	it('exposes contextual roles', () => {
		expect(BusinessRole.MANAGER).toBe('MANAGER')
		expect(BusinessRole.ACCOUNTS).toBe('ACCOUNTS')
	})

	it('exposes business lifecycle states', () => {
		expect(BusinessStatus.PUBLISHED).toBe('PUBLISHED')
		expect(BusinessStatus.SUSPENDED).toBe('SUSPENDED')
		expect(ApplicationStatus.UNDER_REVIEW).toBe('UNDER_REVIEW')
	})
})
