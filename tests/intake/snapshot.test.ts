import { describe, expect, it } from 'vitest'

import { buildIntakeSubmission } from '@/modules/intake/snapshot'
import { decryptSensitiveIntake } from '@/modules/intake/encryption'

const questions = [
  { id: 'general', label: 'Anything we should know?', type: 'LONG_TEXT', required: false, sensitive: false, options: null },
  { id: 'allergies', label: 'List allergies', type: 'SHORT_TEXT', required: true, sensitive: true, options: null },
] as const

describe('intake snapshots', () => {
  it('validates required answers and sensitive consent', () => {
    expect(() => buildIntakeSubmission({ questions: [...questions], answers: {}, sensitiveConsent: false, secret: 'a-secure-intake-secret' })).toThrow('INTAKE_REQUIRED')
    expect(() => buildIntakeSubmission({ questions: [...questions], answers: { allergies: 'Latex' }, sensitiveConsent: false, secret: 'a-secure-intake-secret' })).toThrow('INTAKE_CONSENT_REQUIRED')
  })

  it('keeps an immutable definition and encrypts sensitive answers separately', () => {
    const result = buildIntakeSubmission({ questions: [...questions], answers: { general: 'First visit', allergies: 'Latex' }, sensitiveConsent: true, secret: 'a-secure-intake-secret' })
    expect(result.definition).toEqual(questions)
    expect(result.responses).toEqual({ general: 'First visit' })
    expect(JSON.stringify(result)).not.toContain('Latex')
    expect(decryptSensitiveIntake(result.sensitive!, 'a-secure-intake-secret')).toEqual({ allergies: 'Latex' })
    expect(result.consentAt).toBeInstanceOf(Date)
  })
})
