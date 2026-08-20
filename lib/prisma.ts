import { PrismaClient } from '@prisma/client'

import { managedDatabaseUrl } from './prisma-url'

const globalForPrisma = global as unknown as { prisma: PrismaClient }
const datasourceUrl = managedDatabaseUrl(process.env.DATABASE_URL)
export const prisma =
	globalForPrisma.prisma || new PrismaClient({
		log: ['error'],
		...(datasourceUrl ? { datasourceUrl } : {}),
	})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
