import { describe, expect, it } from 'vitest'
import { legacyManagerDestination } from '@/modules/organizations/legacy-routing'

describe('legacy manager routing', () => {
	it('moves members to the contextual business workspace', () => {
		expect(legacyManagerDestination(true)).toBe('/business')
	})

	it('moves users without a business to onboarding', () => {
		expect(legacyManagerDestination(false)).toBe('/for-business')
	})
})
