import { prisma } from '@/lib/prisma'
import { getSession } from 'next-auth/react'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession({ req: request as any })
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        OwnedSpas: {
          select: { id: true },
        },
      },
    })

    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, replies } = body
    if (status !== undefined && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid support status' }, { status: 400 })
    }
    if (replies !== undefined && typeof replies !== 'string') {
      return NextResponse.json({ error: 'Replies must be text' }, { status: 400 })
    }

    // Verify ownership
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const spaIds = user.OwnedSpas.map((spa) => spa.id)
    if (!ticket.spaId || !spaIds.includes(ticket.spaId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (replies !== undefined) updateData.replies = replies.trim() || null

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Failed to update support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update support ticket' },
      { status: 500 }
    )
  }
}
