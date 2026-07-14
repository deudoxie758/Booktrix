import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'

async function getAdminSession() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role

  if (!userId || role !== 'ADMIN') {
    return null
  }

  return { userId, role }
}

export async function GET() {
  const auth = await getAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const spas = await prisma.spa.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      email: true,
      phone: true,
      createdAt: true,
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          Bookings: true,
          Reviews: true,
          Services: true,
          Employees: true,
        },
      },
    },
  })

  return NextResponse.json({
    spas: spas.map((spa) => ({
      id: spa.id,
      name: spa.name,
      slug: spa.slug,
      address: spa.address,
      email: spa.email,
      phone: spa.phone,
      createdAt: spa.createdAt.toISOString(),
      owner: spa.owner,
      stats: {
        bookings: spa._count.Bookings,
        reviews: spa._count.Reviews,
        services: spa._count.Services,
        employees: spa._count.Employees,
      },
    })),
  })
}
