import { prisma } from '@/lib/prisma'
import { getSession } from 'next-auth/react'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const spaSlug = searchParams.get('spaSlug')

    if (!spaSlug) {
      return NextResponse.json({ error: 'Spa slug required' }, { status: 400 })
    }

    const spa = await prisma.spa.findUnique({
      where: { slug: spaSlug },
    })

    if (!spa) {
      return NextResponse.json({ error: 'Spa not found' }, { status: 404 })
    }

    const reviews = await prisma.review.findMany({
      where: { spaId: spa.id },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    return NextResponse.json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
    })
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession({ req: request as any })
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { spaId, rating, title, comment, bookingId } = body

    if (!spaId || !bookingId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'A completed booking and rating from 1 to 5 are required' }, { status: 400 })
    }
    if (typeof title !== 'string' || !title.trim() || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json({ error: 'Review title and comment are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, spaId, userId: user.id, status: 'COMPLETED' },
      select: { id: true },
    })
    if (!booking) return NextResponse.json({ error: 'This booking is not eligible for a verified review' }, { status: 403 })

    const existing = await prisma.review.findUnique({ where: { bookingId } })
    if (existing) return NextResponse.json({ error: 'This booking has already been reviewed' }, { status: 409 })

    const review = await prisma.review.create({
      data: {
        spaId,
        userId: user.id,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        bookingId,
        verified: true,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'This booking has already been reviewed' }, { status: 409 })
    }
    console.error('Failed to create review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
