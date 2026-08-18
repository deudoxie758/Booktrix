import { randomUUID } from 'node:crypto'

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

import { schedulingRequestLockKeys } from './locking'
import { loadSchedulingFacts, toSchedulingSnapshot } from './repository'
import { deriveValidatedSegments } from './validation'

export type RequestedHoldSegment = Pick<HoldSegment, 'offeringId' | 'membershipId' | 'start' | 'attendeeCount'>

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
  findConflicts(businessId: string, segment: HoldSegment, now: Date): Promise<HoldSegment[]>
  create(hold: Omit<HoldRecord, 'consumedAt'>): Promise<HoldRecord>
  acquireRequestLocks(input: { businessId: string; locationId: string; segments: RequestedHoldSegment[] }): Promise<void>
  deriveSegments(input: { businessId: string; locationId: string; segments: RequestedHoldSegment[] }, now: Date): Promise<HoldSegment[]>
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
    locationId?: string
    segments: RequestedHoldSegment[]
  },
  dependencies: { store: HoldStore; now?: () => Date; token?: () => string },
) {
  const now = dependencies.now?.() ?? new Date()
  return dependencies.store.transaction(async (store) => {
    const locationId = input.locationId ?? (input.segments[0] as HoldSegment | undefined)?.locationId
    if (!locationId) throw new HoldError('SLOT_UNAVAILABLE')
    await store.acquireRequestLocks({ businessId: input.businessId, locationId, segments: input.segments })
    const existing = await store.findByIdempotencyKey(input.idempotencyKey)
    if (existing) {
      const sameOwner = existing.businessId === input.businessId
        && (existing.customerId ?? null) === (input.customerId ?? null)
        && existing.checkoutIdentity === input.checkoutIdentity
      const sameSegments = JSON.stringify(existing.segments.map(serializeRequestedSegment)) === JSON.stringify(input.segments.map(serializeRequestedSegment))
      if (!sameOwner || !sameSegments) throw new HoldError('IDEMPOTENCY_KEY_REUSED')
      return existing
    }
    const segments = await store.deriveSegments({ businessId: input.businessId, locationId, segments: input.segments }, now)
    for (const segment of segments) {
      const conflicts = await store.findConflicts(input.businessId, segment, now)
      if (conflicts.length) throw new HoldError('SLOT_UNAVAILABLE')
    }
    return store.create({
      ...input,
      segments,
      token: dependencies.token?.() ?? randomUUID(),
      expiresAt: new Date(now.getTime() + 10 * 60_000),
    })
  })
}

const serializeRequestedSegment = (segment: RequestedHoldSegment) => ({
  offeringId: segment.offeringId,
  membershipId: segment.membershipId,
  start: segment.start.toISOString(),
  attendeeCount: segment.attendeeCount,
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
  transaction: (work) => prisma.$transaction((tx) => work(createPrismaHoldStore(tx)), { isolationLevel: 'ReadCommitted' }),
  findByIdempotencyKey: async (key) => {
    const hold = await client.bookingHold.findUnique({ where: { idempotencyKey: key }, include: includeSegments })
    return hold ? fromPrisma(hold as never) : null
  },
  findByToken: async (token) => {
    const hold = await client.bookingHold.findUnique({ where: { token }, include: includeSegments })
    return hold ? fromPrisma(hold as never) : null
  },
  findConflicts: async (businessId, segment, now) => {
    const overlap = {
      membershipId: segment.membershipId,
      occupiedStartsAt: { lt: segment.occupiedEnd },
      occupiedEndsAt: { gt: segment.occupiedStart },
    }
    const [holds, bookings] = await Promise.all([
      client.bookingHoldSegment.findMany({ where: { ...overlap, hold: { businessId, expiresAt: { gt: now }, consumedAt: null } } }),
      client.bookingSegment.findMany({ where: { ...overlap, order: { businessId }, status: { in: ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'] } } }),
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
  acquireRequestLocks: async (input) => {
    const keys = Array.from(new Set(input.segments.flatMap((segment) => schedulingRequestLockKeys({ businessId: input.businessId, locationId: input.locationId, ...segment })))).sort()
    for (const key of keys) {
      const bucketAt = new Date(key.slice(key.lastIndexOf(':') + 1))
      await client.schedulingLock.upsert({
        where: { lockKey: key },
        update: { bucketAt },
        create: { lockKey: key, businessId: input.businessId, locationId: input.locationId, bucketAt },
      })
    }
  },
  deriveSegments: async (input, now) => {
    const starts = input.segments.map((segment) => segment.start.getTime())
    const facts = await loadSchedulingFacts({
      businessId: input.businessId,
      locationId: input.locationId,
      offeringIds: input.segments.map((segment) => segment.offeringId),
      membershipIds: input.segments.map((segment) => segment.membershipId),
      rangeStart: new Date(Math.min(...starts) - 86_400_000),
      rangeEnd: new Date(Math.max(...starts) + 86_400_000),
    }, client, now)
    return deriveValidatedSegments(input, toSchedulingSnapshot(facts))
  },
})

export const prismaHoldStore: HoldStore = createPrismaHoldStore(prisma)
