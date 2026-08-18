import { describe, expect, it } from 'vitest'
import { businessApplicationSchema } from '@/modules/organizations/application-schema'
import { canTransitionBusiness, isBusinessSetupReady } from '@/modules/organizations/lifecycle'

describe('business lifecycle', () => {
	it('allows review and approval transitions but rejects skipped setup', () => {
		expect(canTransitionBusiness('APPLICATION', 'UNDER_REVIEW')).toBe(true)
		expect(canTransitionBusiness('UNDER_REVIEW', 'APPROVED')).toBe(true)
		expect(canTransitionBusiness('APPROVED', 'PUBLISHED')).toBe(false)
	})

	it('requires every setup gate before publication', () => {
		expect(isBusinessSetupReady({ profileComplete: true, firstLocationComplete: true, policiesAccepted: true, publicationReady: false })).toBe(false)
		expect(isBusinessSetupReady({ profileComplete: true, firstLocationComplete: true, policiesAccepted: true, publicationReady: true })).toBe(true)
	})
})

describe('business application input', () => {
	it('normalizes email and rejects incomplete service details', () => {
		const invalid = businessApplicationSchema.safeParse({
			businessName: 'Island Services', ownerName: 'Maya James', email: ' MAYA@EXAMPLE.COM ', phone: '7585550100',
			address: 'Castries, Saint Lucia', industry: 'Professional Services', serviceSummary: 'Short', termsAccepted: true,
		})
		expect(invalid.success).toBe(false)

		const valid = businessApplicationSchema.parse({
			businessName: 'Island Services', ownerName: 'Maya James', email: ' MAYA@EXAMPLE.COM ', phone: '7585550100',
			address: 'Castries, Saint Lucia', industry: 'Professional Services', serviceSummary: 'Mobile and in-office professional consultations.', termsAccepted: true,
		})
		expect(valid.email).toBe('maya@example.com')
	})
})
