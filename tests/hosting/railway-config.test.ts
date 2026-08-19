import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Railway deployment configuration', () => {
  it('deploys one instance only after migrations and checks readiness', () => {
    const config = readFileSync(resolve(process.cwd(), 'railway.toml'), 'utf8')
    expect(config).toContain('buildCommand = "npm run build"')
    expect(config).toContain('preDeployCommand = "npx prisma migrate deploy"')
    expect(config).toContain('startCommand = "npm start"')
    expect(config).toContain('healthcheckPath = "/api/health"')
    expect(config).toContain('numReplicas = 1')
  })
})
