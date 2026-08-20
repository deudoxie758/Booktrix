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

  it('restarts on failure with a bounded retry count, matching the documented one-replica constraint', () => {
    const config = readFileSync(resolve(process.cwd(), 'railway.toml'), 'utf8')
    expect(config).toContain('restartPolicyType = "ON_FAILURE"')
    expect(config).toContain('restartPolicyMaxRetries = 3')
    expect(config).toContain('healthcheckTimeout = 30')
  })

  it('documents the Railway one-replica constraint and rollback-through-image behavior in DEPLOYMENT.md', () => {
    const deployment = readFileSync(resolve(process.cwd(), 'DEPLOYMENT.md'), 'utf8')
    expect(deployment).toMatch(/numReplicas=1/)
    expect(deployment).toMatch(/rollback of the \*\*application image\*\*/i)
    expect(deployment).toMatch(/does not, by itself, reverse any migration/i)
  })
})
