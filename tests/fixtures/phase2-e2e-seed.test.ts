import { describe, expect, it } from 'vitest'

import { assertFixtureOwnership, fixtureOwnership } from '@/scripts/seed-phase2-e2e'

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
