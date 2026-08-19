import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { checkReadiness } from '@/lib/readiness'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await checkReadiness({ queryDatabase: () => prisma.$queryRaw`SELECT 1` })
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  })
}
