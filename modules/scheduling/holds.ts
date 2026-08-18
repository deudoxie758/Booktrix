import { randomUUID } from 'node:crypto'

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

import { schedulingLockBucketAt, schedulingRequestLockKeys } from './locking'
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
  validateRequestScope(input: { businessId: string; locationId: string; segments: RequestedHoldSegment[] }): Promise<void>
  acquireRequestLocks(input: { businessId: string; locationId: string; segments: RequestedHoldSegment[] }): Promise<void>
  deriveSegments(input: { businessId: string; locationId: string; segments: RequestedHoldSegment[] }, now: Date): Promise<HoldSegment[]>
}

export class HoldError extends Error {
  constructor(public readonly code: 'SLOT_UNAVAILABLE' | 'HOLD_EXPIRED' | 'HOLD_NOT_FOUND' | 'IDEMPOTENCY_KEY_REUSED') {
    super(code)
  }
}

function assertIdempotentHold(existing: HoldRecord, input: {
  businessId: string
  customerId?: string | null
  checkoutIdentity: string
  locationId: string
  segments: RequestedHoldSegment[]
}) {
  const sameOwner = existing.businessId === input.businessId
    && (existing.customerId ?? null) === (input.customerId ?? null)
    && existing.checkoutIdentity === input.checkoutIdentity
  const sameLocation = existing.segments.length > 0
    && existing.segments.every((segment) => segment.locationId === input.locationId)
  const sameSegments = JSON.stringify(existing.segments.map(serializeRequestedSegment)) === JSON.stringify(input.segments.map(serializeRequestedSegment))
  if (!sameOwner || !sameLocation || !sameSegments) throw new HoldError('IDEMPOTENCY_KEY_REUSED')
  return existing
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
    const existingBeforeLocks = await store.findByIdempotencyKey(input.idempotencyKey)
    if (existingBeforeLocks) return assertIdempotentHold(existingBeforeLocks, { ...input, locationId })
    await store.validateRequestScope({ businessId: input.businessId, locationId, segments: input.segments })
    await store.acquireRequestLocks({ businessId: input.businessId, locationId, segments: input.segments })
    const existing = await store.findByIdempotencyKey(input.idempotencyKey)
    if (existing) return assertIdempotentHold(existing, { ...input, locationId })
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

export const bookingHoldTransactionOptions = {
  isolationLevel: 'ReadCommitted' as const,
  maxWait: 20_000,
  timeout: 20_000,
}

const createPrismaHoldStore = (client: HoldPrismaClient): HoldStore => ({
  transaction: (work) => prisma.$transaction((tx) => work(createPrismaHoldStore(tx)), bookingHoldTransactionOptions),
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
  validateRequestScope: async (input) => {
    const offeringIds = Array.from(new Set(input.segments.map((segment) => segment.offeringId)))
    const membershipIds = Array.from(new Set(input.segments.map((segment) => segment.membershipId)))
    const [location, offerings, qualifications] = await Promise.all([
      client.location.findFirst({
        where: { id: input.locationId, businessId: input.businessId, isActive: true, business: { status: 'PUBLISHED' } },
        select: { id: true },
      }),
      client.serviceOffering.findMany({
        where: { id: { in: offeringIds }, businessId: input.businessId, active: true, Locations: { some: { locationId: input.locationId, active: true } } },
        select: { id: true },
      }),
      client.staffQualification.findMany({
        where: {
          offeringId: { in: offeringIds }, membershipId: { in: membershipIds }, locationId: input.locationId, active: true,
          membership: { businessId: input.businessId, active: true, Locations: { some: { locationId: input.locationId } } },
        },
        select: { offeringId: true, membershipId: true },
      }),
    ])
    const validOfferings = new Set(offerings.map((offering) => offering.id))
    const pairKey = (offeringId: string, membershipId: string) => JSON.stringify([offeringId, membershipId])
    const validPairs = new Set(qualifications.map((qualification) => pairKey(qualification.offeringId, qualification.membershipId)))
    if (!location || offeringIds.some((id) => !validOfferings.has(id))
      || input.segments.some((segment) => !validPairs.has(pairKey(segment.offeringId, segment.membershipId)))) {
      throw new HoldError('SLOT_UNAVAILABLE')
    }
  },
  acquireRequestLocks: async (input) => {
    const keys = Array.from(new Set(input.segments.flatMap((segment) => schedulingRequestLockKeys({ businessId: input.businessId, locationId: input.locationId, ...segment })))).sort()
    for (const key of keys) {
      const bucketAt = schedulingLockBucketAt(key)
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
