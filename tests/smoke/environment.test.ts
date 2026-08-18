import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('test environment', () => {
	it('resolves application aliases', () => {
		expect(prisma).toBeDefined()
	})
})
