import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePlatformAdmin } from '@/modules/organizations/access'
import { hash } from 'bcryptjs'
import { Role } from '@prisma/client'

async function getAdminSession() {
	try { const actor = await requirePlatformAdmin(); return { userId: actor.id, role: actor.platformRole } }
	catch { return null }
}

function isValidRole(role: unknown): role is Role {
  return typeof role === 'string' && ['USER', 'OWNER', 'EMPLOYEE', 'ACCOUNTANT', 'ADMIN'].includes(role)
}

export async function GET() {
  const auth = await getAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ users: users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  })) })
}

export async function POST(req: Request) {
  const auth = await getAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, name, password, role } = await req.json()
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 },
    )
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 })
  }

  const hashedPassword = await hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      hashedPassword,
      role: isValidRole(role) ? role : 'USER',
    },
  })

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  })
}

export async function PUT(req: Request) {
  const auth = await getAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, email, name, password, role } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const data: { email?: string; name?: string; role?: Role; hashedPassword?: string } = {}
  if (email) data.email = email
  if (name) data.name = name
  if (isValidRole(role)) data.role = role
  if (password) data.hashedPassword = await hash(password, 10)

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt.toISOString(),
    },
  })
}

export async function DELETE(req: Request) {
  const auth = await getAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  if (id === auth.userId) {
    return NextResponse.json(
      { error: 'You cannot delete your own account from the admin panel' },
      { status: 400 },
    )
  }

  const linkedSpaCount = await prisma.spa.count({ where: { ownerId: id } })
  const bookingCount = await prisma.booking.count({ where: { userId: id } })

  if (linkedSpaCount > 0) {
    return NextResponse.json(
      {
        error:
          'Cannot delete an owner who still has one or more registered spas. Remove or reassign their spa(s) first.',
      },
      { status: 400 },
    )
  }

  if (bookingCount > 0) {
    return NextResponse.json(
      {
        error:
          'Cannot delete a user with existing booking history. Reassign or archive their bookings first.',
      },
      { status: 400 },
    )
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
