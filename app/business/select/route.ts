import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getActor } from '@/modules/identity/session'
import { selectedBusinessCookie, workspaceDestination } from '@/modules/organizations/workspace-selection'

export async function GET(request: Request) {
  const actor = await getActor()
  if (!actor) return NextResponse.redirect(new URL('/auth/sign-in?callbackUrl=/profile', request.url))

  const businessId = new URL(request.url).searchParams.get('businessId')
  if (!businessId) return NextResponse.redirect(new URL('/profile', request.url))
  const membership = await prisma.businessMembership.findUnique({ where: { businessId_userId: { businessId, userId: actor.id } }, select: { role: true, active: true } })
  if (!membership?.active) return NextResponse.redirect(new URL('/profile', request.url))

  const response = NextResponse.redirect(new URL(workspaceDestination(membership.role), request.url))
  response.cookies.set(selectedBusinessCookie, businessId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })
  return response
}
