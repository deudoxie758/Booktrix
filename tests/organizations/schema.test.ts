import { BusinessRole, BusinessStatus, ApplicationStatus } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8')

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

	it('models hashed, expiring, revocable, email-bound business invitations with initial scope', () => {
		const invitationModel = schema.match(/model BusinessInvitation \{[\s\S]*?\n\}/)?.[0] ?? ''
		expect(schema).toMatch(/model BusinessInvitation \{[\s\S]*tokenHash\s+String[\s\S]*expiresAt\s+DateTime[\s\S]*acceptedAt\s+DateTime\?[\s\S]*revokedAt\s+DateTime\?[\s\S]*inviterId\s+String[\s\S]*@@index\(\[businessId, normalizedEmail/)
		expect(schema).toMatch(/model BusinessInvitationLocation \{[\s\S]*invitationId\s+String[\s\S]*locationId\s+String[\s\S]*@@id\(\[invitationId, locationId\]\)/)
		expect(schema).toMatch(/model BusinessInvitationQualification \{[\s\S]*invitationId\s+String[\s\S]*offeringId\s+String[\s\S]*locationId\s+String[\s\S]*@@id\(\[invitationId, offeringId, locationId\]\)/)
		expect(schema).toMatch(/activeKey\s+String\?\s+@unique/)
		expect(invitationModel).not.toMatch(/\btoken\s+String/)
	})
})
