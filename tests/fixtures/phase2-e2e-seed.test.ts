import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const seedSource = readFileSync(path.resolve(process.cwd(), 'scripts/seed-phase2-e2e.ts'), 'utf8')

describe('Phase 2 E2E demo storefront fixtures', () => {
  it('defines six published Saint Lucian demo storefronts with deterministic identities', () => {
    for (const slug of [
      'sole-wellness-house',
      'muse-nail-atelier',
      'crown-and-coil-studio',
      'harbour-bodyworks',
      'piton-movement-club',
      'island-glow-beauty-bar',
    ]) {
      expect(seedSource).toContain(`slug: '${slug}'`)
      expect(seedSource).toContain(`id: 'booktrix-e2e-business-${slug}'`)
    }
    expect(seedSource).toContain("for (const fixture of demoBusinesses) await seedDemoBusiness(fixture)")
  })

  it('is non-destructive and supplies locations, staff qualifications, schedules, and payment choices', () => {
    expect(seedSource).not.toMatch(/\.(delete|deleteMany|updateMany)\s*\(/)
    expect(seedSource.match(/\.upsert\s*\(/g)?.length).toBeGreaterThanOrEqual(15)
    for (const model of ['locationHours', 'staffSchedule', 'staffQualification', 'serviceLocation', 'locationAssignment']) {
      expect(seedSource).toContain(`prisma.${model}.upsert`)
    }
    for (const paymentChoice of ['allowFullPayment', 'allowDeposit', 'allowCash']) expect(seedSource).toContain(paymentChoice)
  })
})
