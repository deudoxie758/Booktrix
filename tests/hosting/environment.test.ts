import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { validateProductionEnvironment } from '@/lib/environment'

describe('production environment validation', () => {
  const valid = {
    NODE_ENV: 'production',
    DATABASE_URL: 'mysql://user:secret@db.example.com:3306/booktrix',
    NEXTAUTH_URL: 'https://staging.booktrix.com',
    NEXTAUTH_SECRET: 'a-high-entropy-secret-with-at-least-32-characters',
  }

  it('accepts a secure production environment', () => {
    expect(() => validateProductionEnvironment(valid)).not.toThrow()
  })

  it.each(['DATABASE_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET'] as const)('rejects a missing %s', (key) => {
    expect(() => validateProductionEnvironment({ ...valid, [key]: '' })).toThrow(key)
  })

  it('requires HTTPS and a high-entropy auth secret in production', () => {
    expect(() => validateProductionEnvironment({ ...valid, NEXTAUTH_URL: 'http://booktrix.example.com' })).toThrow('NEXTAUTH_URL')
    expect(() => validateProductionEnvironment({ ...valid, NEXTAUTH_SECRET: 'password123' })).toThrow('NEXTAUTH_SECRET')
  })

  it('requires a structurally valid MySQL database URL', () => {
    expect(() => validateProductionEnvironment({ ...valid, DATABASE_URL: 'not-a-url' })).toThrow('DATABASE_URL')
    expect(() => validateProductionEnvironment({ ...valid, DATABASE_URL: 'postgresql://db.example.com/booktrix' })).toThrow('DATABASE_URL')
    expect(() => validateProductionEnvironment({ ...valid, DATABASE_URL: 'mysql://db.example.com' })).toThrow('DATABASE_URL')
    expect(() => validateProductionEnvironment({ ...valid, DATABASE_URL: 'mysql://USER:PASSWORD@HOST:3306/DATABASE' })).toThrow('DATABASE_URL')
  })

  it('requires NEXTAUTH_URL to be a canonical origin without credentials, query, hash, or path', () => {
    expect(() => validateProductionEnvironment({ ...valid, NEXTAUTH_URL: 'https://user:pass@booktrix.example.com' })).toThrow('NEXTAUTH_URL')
    expect(() => validateProductionEnvironment({ ...valid, NEXTAUTH_URL: 'https://booktrix.example.com/path?mode=test#fragment' })).toThrow('NEXTAUTH_URL')
  })

  it('rejects known placeholder and low-diversity authentication secrets', () => {
    expect(() => validateProductionEnvironment({ ...valid, NEXTAUTH_SECRET: 'replace-with-at-least-32-random-characters' })).toThrow('NEXTAUTH_SECRET')
    expect(() => validateProductionEnvironment({ ...valid, NEXTAUTH_SECRET: 'a'.repeat(32) })).toThrow('NEXTAUTH_SECRET')
  })

  it('does not impose production-only requirements during local development', () => {
    expect(() => validateProductionEnvironment({ NODE_ENV: 'development' })).not.toThrow()
  })

  it('runs the validator before the production server starts', () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
    expect(packageJson.scripts.prestart).toBe('node scripts/validate-production-env.js')
  })
})
