import { describe, expect, it } from 'vitest'

import {
  assertFixtureOwnership,
  expiredInvitationWindow,
  fixtureOwnership,
  pendingInvitationWindow,
  stLuciaFutureAppointment,
  workspaceSecurityFixtures,
} from '@/scripts/seed-phase2-e2e'

describe('Phase 2 E2E demo storefront fixtures', () => {
  it('defines deterministic ownership for the six demo storefronts', () => {
    expect(fixtureOwnership.businesses).toEqual(expect.arrayContaining([
      { id: 'booktrix-e2e-business-sole-wellness-house', slug: 'sole-wellness-house' },
      { id: 'booktrix-e2e-business-muse-nail-atelier', slug: 'muse-nail-atelier' },
      { id: 'booktrix-e2e-business-crown-and-coil-studio', slug: 'crown-and-coil-studio' },
      { id: 'booktrix-e2e-business-harbour-bodyworks', slug: 'harbour-bodyworks' },
      { id: 'booktrix-e2e-business-piton-movement-club', slug: 'piton-movement-club' },
      { id: 'booktrix-e2e-business-island-glow-beauty-bar', slug: 'island-glow-beauty-bar' },
    ]))
    expect(fixtureOwnership.users.every((user) => user.id.startsWith('booktrix-e2e-'))).toBe(true)
  })

  it('rejects an unrelated record occupying a fixture email or slug before writes', () => {
    expect(() => assertFixtureOwnership(fixtureOwnership, {
      users: [{ id: 'unrelated-user', email: fixtureOwnership.users[0].email }],
      businesses: [{ id: 'unrelated-business', slug: fixtureOwnership.businesses[0].slug }],
    })).toThrow(/fixture ownership collision/i)
  })

  it('accepts an exact prior fixture run and includes a cash-only offering', () => {
    expect(() => assertFixtureOwnership(fixtureOwnership, fixtureOwnership)).not.toThrow()
    expect(fixtureOwnership.offerings.some((offering) => offering.allowCash && !offering.allowFullPayment && !offering.allowDeposit)).toBe(true)
  })
})

describe('Task 6 workspace security and finance fixtures', () => {
  it('defines a stable, namespaced inactive location for the E2E studio business', () => {
    expect(workspaceSecurityFixtures.inactiveLocationId).toBe('booktrix-e2e-location-retired')
    expect(workspaceSecurityFixtures.inactiveLocationId.startsWith('booktrix-e2e-')).toBe(true)
  })

  it('defines a fixed plaintext token and stable id for every stage of the invitation lifecycle', () => {
    for (const invitation of Object.values(workspaceSecurityFixtures.invitations)) {
      expect(invitation.id.startsWith('booktrix-e2e-invitation-')).toBe(true)
      expect(invitation.token.length).toBeGreaterThan(16)
      expect(invitation.email).toMatch(/^[^\s@]+@booktrix\.test$/)
    }
    // Distinct tokens per lifecycle stage, so a spec can replay each independently.
    const tokens = new Set(Object.values(workspaceSecurityFixtures.invitations).map((invitation) => invitation.token))
    expect(tokens.size).toBe(3)
  })

  it('computes a pending invitation window that always expires in the future relative to now', () => {
    const now = new Date('2026-08-19T12:00:00.000Z')
    const { expiresAt } = pendingInvitationWindow(now)
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime())
  })

  it('computes an expired invitation window that always expired in the past relative to now', () => {
    const now = new Date('2026-08-19T12:00:00.000Z')
    const { expiresAt } = expiredInvitationWindow(now)
    expect(expiresAt.getTime()).toBeLessThan(now.getTime())
  })

  it('computes Saint Lucia-relative future appointment windows for cash-due bookings', () => {
    const now = new Date('2026-08-19T12:00:00.000Z')
    const { startsAt, endsAt } = stLuciaFutureAppointment(now, 2, 10)
    expect(startsAt.getTime()).toBeGreaterThan(now.getTime())
    expect(endsAt.getTime()).toBeGreaterThan(startsAt.getTime())
    // 10am America/St_Lucia (UTC-4, no DST) is 14:00 UTC.
    expect(startsAt.getUTCHours()).toBe(14)
  })

  it('defines stable cash-due, partially-collected, and foreign-location booking order fixtures', () => {
    const { dueCastries, partialCastries, dueRodneyBay } = workspaceSecurityFixtures.cashOrders
    expect(dueCastries.id.startsWith('booktrix-e2e-order-')).toBe(true)
    expect(partialCastries.cashCollectedCents).toBeGreaterThan(0)
    expect(partialCastries.cashCollectedCents).toBeLessThan(partialCastries.cashDueCents)
    expect(dueRodneyBay.id).not.toBe(dueCastries.id)
  })

  it('reuses an existing, wholly separate demo business as the cross-tenant forgery target', () => {
    const { foreignBusinessId, foreignLocationId, foreignOwnerEmail } = workspaceSecurityFixtures.crossTenant
    expect(foreignBusinessId).not.toBe(workspaceSecurityFixtures.business.id)
    expect(fixtureOwnership.businesses.some((business) => business.id === foreignBusinessId)).toBe(true)
    expect(fixtureOwnership.users.some((user) => user.email === foreignOwnerEmail)).toBe(true)
    expect(foreignLocationId.startsWith('booktrix-e2e-location-')).toBe(true)
  })
})
