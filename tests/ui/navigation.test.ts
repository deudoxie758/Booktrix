import { describe, expect, it } from 'vitest'
import { getWorkspaceNavigation } from '@/components/shells/navigation'

describe('workspace navigation', () => {
	it.each([
		['OWNER', ['Overview', 'Calendar', 'Customers', 'Services', 'Team', 'Locations', 'Finance', 'Business settings']],
		['MANAGER', ['Overview', 'Calendar', 'Customers', 'Services', 'Team', 'Locations']],
		['STAFF', ['Overview', 'My schedule', 'Customers']],
		['ACCOUNTS', ['Overview', 'Finance', 'Locations']],
	] as const)('provides the approved destinations to %s users', (role, labels) => {
		expect(getWorkspaceNavigation(role).map((item) => item.label)).toEqual(labels)
	})

	it('shows finance but not staff management to accounts users', () => {
		const labels = getWorkspaceNavigation('ACCOUNTS').map((item) => item.label)
		expect(labels).toContain('Finance')
		expect(labels).not.toContain('Team')
	})

	it('shows company settings and team management to owners', () => {
		const labels = getWorkspaceNavigation('OWNER').map((item) => item.label)
		expect(labels).toContain('Team')
		expect(labels).toContain('Business settings')
	})

	it('limits staff to their operational views', () => {
		expect(getWorkspaceNavigation('STAFF').map((item) => item.label)).toEqual(['Overview', 'My schedule', 'Customers'])
	})
})
