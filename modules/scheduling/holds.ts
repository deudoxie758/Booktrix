import { randomUUID } from 'node:crypto'

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

import { schedulingLockKeys } from './locking'

export type HoldSegment = {
  offeringId: string
  locationId: string
  membershipId: string
  start: Date
  end: Date
  occupiedStart: Date
  occupiedEnd: Date
  attendeeCount: number
  capacity: number
  priceCents: number
}

export type HoldRecord = {
  token: string
  idempotencyKey: string
  businessId: string
  customerId?: string | null
  checkoutIdentity: string
  expiresAt: Date
  consumedAt: Date | null
  segments: HoldSegment[]
}

export interface HoldStore {
  transaction<T>(work: (store: HoldStore) => Promise<T>): Promise<T>
  findByIdempotencyKey(key: string): Promise<HoldRecord | null>
  findByToken(token: string): Promise<HoldRecord | null>
  findConflicts(segment: HoldSegment, now: Date): Promise<HoldSegment[]>
  create(hold: Omit<HoldRecord, 'consumedAt'>): Promise<HoldRecord>
  acquireLocks?(keys: string[], input: { businessId: string; locationId: string }): Promise<void>
}

export class HoldError extends Error {
  constructor(public readonly code: 'SLOT_UNAVAILABLE' | 'HOLD_EXPIRED' | 'HOLD_NOT_FOUND' | 'IDEMPOTENCY_KEY_REUSED') {
    super(code)
  }
}

export async function createBookingHold(
  input: {
    businessId: string
    customerId?: string | null
    checkoutIdentity: string
    idempotencyKey: string
    segments: HoldSegment[]
  },
  dependencies: { store: HoldStore; now?: () => Date; token?: () => string },
) {
  const now = dependencies.now?.() ?? new Date()
  return dependencies.store.transaction(async (store) => {
    const existing = await store.findByIdempotencyKey(input.idempotencyKey)
    if (existing) {
      const sameOwner = existing.businessId === input.businessId
        && (existing.customerId ?? null) === (input.customerId ?? null)
        && existing.checkoutIdentity === input.checkoutIdentity
      const sameSegments = JSON.stringify(existing.segments.map(serializeSegment)) === JSON.stringify(input.segments.map(serializeSegment))
      if (!sameOwner || !sameSegments) throw new HoldError('IDEMPOTENCY_KEY_REUSED')
      return existing
    }
    const keys = input.segments.flatMap((segment) => schedulingLockKeys({ businessId: input.businessId, ...segment }))
    await store.acquireLocks?.(Array.from(new Set(keys)).sort(), {
      businessId: input.businessId,
      locationId: input.segments[0]!.locationId,
    })
    for (const segment of input.segments) {
      const conflicts = await store.findConflicts(segment, now)
      const reserved = conflicts.reduce((total, conflict) => total + conflict.attendeeCount, 0)
      if (reserved + segment.attendeeCount > segment.capacity) throw new HoldError('SLOT_UNAVAILABLE')
    }
    return store.create({
      ...input,
      token: dependencies.token?.() ?? randomUUID(),
      expiresAt: new Date(now.getTime() + 10 * 60_000),
    })
  })
}

const serializeSegment = (segment: HoldSegment) => ({
  offeringId: segment.offeringId,
  locationId: segment.locationId,
  membershipId: segment.membershipId,
  start: segment.start.toISOString(),
  end: segment.end.toISOString(),
  occupiedStart: segment.occupiedStart.toISOString(),
  occupiedEnd: segment.occupiedEnd.toISOString(),
  attendeeCount: segment.attendeeCount,
  priceCents: segment.priceCents,
})

export async function getActiveHold(
  token: string,
  dependencies: { store: HoldStore; now?: () => Date },
) {
  const hold = await dependencies.store.findByToken(token)
  if (!hold) throw new HoldError('HOLD_NOT_FOUND')
  if (hold.consumedAt || hold.expiresAt <= (dependencies.now?.() ?? new Date())) throw new HoldError('HOLD_EXPIRED')
  return hold
}

const includeSegments = { Segments: true } as const
const fromPrisma = (hold: Awaited<ReturnType<typeof prisma.bookingHold.findFirstOrThrow>> & { Segments: Array<Record<string, unknown>> }): HoldRecord => ({
  token: hold.token,
  idempotencyKey: hold.idempotencyKey,
  businessId: hold.businessId,
  customerId: hold.customerId,
  checkoutIdentity: hold.checkoutIdentity,
  expiresAt: hold.expiresAt,
  consumedAt: hold.consumedAt,
  segments: hold.Segments.map((segment) => ({
    offeringId: segment.offeringId as string,
    locationId: segment.locationId as string,
    membershipId: segment.membershipId as string,
    start: segment.startsAt as Date,
    end: segment.endsAt as Date,
    occupiedStart: segment.occupiedStartsAt as Date,
    occupiedEnd: segment.occupiedEndsAt as Date,
    attendeeCount: segment.attendeeCount as number,
    capacity: Number.MAX_SAFE_INTEGER,
    priceCents: segment.priceCents as number,
  })),
})

type HoldPrismaClient = typeof prisma | Prisma.TransactionClient

const createPrismaHoldStore = (client: HoldPrismaClient): HoldStore => ({
  transaction: (work) => prisma.$transaction((tx) => work(createPrismaHoldStore(tx))),
  findByIdempotencyKey: async (key) => {
    const hold = await client.bookingHold.findUnique({ where: { idempotencyKey: key }, include: includeSegments })
    return hold ? fromPrisma(hold as never) : null
  },
  findByToken: async (token) => {
    const hold = await client.bookingHold.findUnique({ where: { token }, include: includeSegments })
    return hold ? fromPrisma(hold as never) : null
  },
  findConflicts: async (segment, now) => {
    const overlap = {
      membershipId: segment.membershipId,
      occupiedStartsAt: { lt: segment.occupiedEnd },
      occupiedEndsAt: { gt: segment.occupiedStart },
    }
    const [holds, bookings] = await Promise.all([
      client.bookingHoldSegment.findMany({ where: { ...overlap, hold: { expiresAt: { gt: now }, consumedAt: null } } }),
      client.bookingSegment.findMany({ where: { ...overlap, status: { in: ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'] } } }),
    ])
    return [...holds, ...bookings].map((row) => ({ ...segment, attendeeCount: row.attendeeCount }))
  },
  create: async (hold) => fromPrisma(await client.bookingHold.create({
    data: {
      token: hold.token,
      idempotencyKey: hold.idempotencyKey,
      businessId: hold.businessId,
      customerId: hold.customerId,
      checkoutIdentity: hold.checkoutIdentity,
      expiresAt: hold.expiresAt,
      Segments: { create: hold.segments.map((segment) => ({
        offeringId: segment.offeringId,
        locationId: segment.locationId,
        membershipId: segment.membershipId,
        startsAt: segment.start,
        endsAt: segment.end,
        occupiedStartsAt: segment.occupiedStart,
        occupiedEndsAt: segment.occupiedEnd,
        attendeeCount: segment.attendeeCount,
        priceCents: segment.priceCents,
      })) },
    },
    include: includeSegments,
  }) as never),
  acquireLocks: async (keys, input) => {
    for (const key of keys) {
      const bucketAt = new Date(key.slice(key.lastIndexOf(':') + 1))
      await client.schedulingLock.upsert({
        where: { lockKey: key },
        update: { bucketAt },
        create: { lockKey: key, businessId: input.businessId, locationId: input.locationId, bucketAt },
      })
    }
  },
})

export const prismaHoldStore: HoldStore = createPrismaHoldStore(prisma)
