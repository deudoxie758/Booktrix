import { describe, expect, it } from 'vitest'

import { decryptSensitiveIntake, encryptSensitiveIntake } from '@/modules/intake/encryption'

describe('sensitive intake encryption', () => {
  it('round-trips authenticated encrypted responses without plaintext storage', () => {
    const secret = 'a-secure-intake-encryption-secret'
    const encrypted = encryptSensitiveIntake({ allergies: 'Latex' }, secret)
    expect(encrypted.ciphertext).not.toContain('Latex')
    expect(decryptSensitiveIntake(encrypted, secret)).toEqual({ allergies: 'Latex' })
  })

  it('rejects tampered ciphertext and short secrets', () => {
    expect(() => encryptSensitiveIntake({}, 'short')).toThrow('INTAKE_ENCRYPTION_SECRET_INVALID')
    const encrypted = encryptSensitiveIntake({ consent: 'yes' }, 'a-secure-intake-encryption-secret')
    const tampered = `${encrypted.ciphertext[0] === 'A' ? 'B' : 'A'}${encrypted.ciphertext.slice(1)}`
    expect(() => decryptSensitiveIntake({ ...encrypted, ciphertext: tampered }, 'a-secure-intake-encryption-secret')).toThrow()
  })
})
