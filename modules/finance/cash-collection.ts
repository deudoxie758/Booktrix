import type { Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { classifyOrderFinance } from './ledger'

export const financeError = (code: string) => Object.assign(new Error(code), { code })

type CashActorAccess = { membershipId: string; businessId: string; role: 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'STAFF'; active: boolean; assignedLocationIds: string[] }

type LockedOrder = {
  id: string
  businessId: string
  status: string
  paymentChoice: 'FULL' | 'DEPOSIT' | 'CASH'
  segments: Array<{ locationId: string; status: string; priceCents: number; depositKind?: 'FIXED' | 'PERCENTAGE' | null; depositValue?: number | null }>
}

export type CashCollectionRecord = {
  id: string
  businessId: string
  orderId: string
  locationId: string
  collectorId: string
  kind: 'COLLECTION' | 'ADJUSTMENT'
  amountCents: number
  idempotencyKey: string
  adjustmentOfId: string | null
  note: string | null
  createdAt: Date
}

export type CashCollectionTransaction = {
  getActorAccess(input: { actorId: string; businessId: string }): Promise<CashActorAccess | null>
  lockOrder(input: { orderId: string; businessId: string }): Promise<LockedOrder | null>
  findExistingByIdempotencyKey(input: { businessId: string; idempotencyKey: string }): Promise<CashCollectionRecord | null>
  findAdjustmentTarget(input: { id: string; orderId: string }): Promise<{ id: string } | null>
  sumCollectedCents(input: { orderId: string }): Promise<{ collectionCents: number; totalCents: number }>
  createCollection(input: { businessId: string; orderId: string; locationId: string; collectorId: string; kind: 'COLLECTION' | 'ADJUSTMENT'; amountCents: number; idempotencyKey: string; adjustmentOfId: string | null; note: string | null; now: Date }): Promise<CashCollectionRecord>
  createAudit(input: { businessId: string; actorId: string; actorRole: Role; action: string; details: Record<string, unknown> }): Promise<void>
}

export type CashCollectionRepository = {
  transaction<T>(work: (transaction: CashCollectionTransaction) => Promise<T>, options?: { isolationLevel?: 'ReadCommitted' }): Promise<T>
}

export type RecordCashCollectionInput = {
  actorId: string
  businessId: string
  orderId: string
  amountCents: number
  idempotencyKey: string
  adjustmentOfId?: string
  note?: string
  now?: Date
}

export type RecordCashCollectionResult = {
  id: string
  orderId: string
  kind: 'COLLECTION' | 'ADJUSTMENT'
  amountCents: number
  cashDueCents: number
  cashCollectedCents: number
  cashRemainingCents: number
  createdAt: Date
}

function auditRole(role: CashActorAccess['role']): Role {
  if (role === 'OWNER') return 'OWNER'
  if (role === 'ACCOUNTS') return 'ACCOUNTANT'
  return 'USER'
}

function assertIdempotentReplay(existing: CashCollectionRecord, input: RecordCashCollectionInput) {
  const sameRequest = existing.orderId === input.orderId
    && existing.amountCents === input.amountCents
    && existing.adjustmentOfId === (input.adjustmentOfId ?? null)
  if (!sameRequest) throw financeError('FINANCE_CASH_IDEMPOTENCY_KEY_REUSED')
}

export async function recordCashCollection(input: RecordCashCollectionInput, repository: CashCollectionRepository = defaultRepository): Promise<RecordCashCollectionResult> {
  const now = input.now ?? new Date()
  if (!input.idempotencyKey) throw financeError('FINANCE_CASH_IDEMPOTENCY_KEY_REQUIRED')
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw financeError('FINANCE_CASH_INVALID_AMOUNT')

  return repository.transaction(async (transaction) => {
    const actor = await transaction.getActorAccess({ actorId: input.actorId, businessId: input.businessId })
    if (!actor?.active || !['OWNER', 'ACCOUNTS'].includes(actor.role)) throw financeError('FINANCE_ACCESS_DENIED')

    const order = await transaction.lockOrder({ orderId: input.orderId, businessId: input.businessId })
    if (!order) throw financeError('FINANCE_ORDER_NOT_FOUND')

    const locationId = order.segments[0]?.locationId
    if (!locationId) throw financeError('FINANCE_ORDER_NOT_FOUND')
    if (actor.role === 'ACCOUNTS' && !actor.assignedLocationIds.includes(locationId)) throw financeError('FINANCE_LOCATION_DENIED')

    const existing = await transaction.findExistingByIdempotencyKey({ businessId: input.businessId, idempotencyKey: input.idempotencyKey })
    if (existing) {
      assertIdempotentReplay(existing, input)
      const totals = await transaction.sumCollectedCents({ orderId: order.id })
      const classification = classifyOrderFinance(order)
      return {
        id: existing.id, orderId: existing.orderId, kind: existing.kind, amountCents: existing.amountCents,
        cashDueCents: classification.cashDueCents, cashCollectedCents: totals.totalCents, cashRemainingCents: classification.cashDueCents - totals.totalCents, createdAt: existing.createdAt,
      }
    }

    const kind: 'COLLECTION' | 'ADJUSTMENT' = input.adjustmentOfId ? 'ADJUSTMENT' : 'COLLECTION'
    if (kind === 'ADJUSTMENT') {
      const target = await transaction.findAdjustmentTarget({ id: input.adjustmentOfId!, orderId: order.id })
      if (!target) throw financeError('FINANCE_CASH_ADJUSTMENT_TARGET_INVALID')
    }

    const classification = classifyOrderFinance(order)
    const totals = await transaction.sumCollectedCents({ orderId: order.id })
    if (kind === 'COLLECTION' && totals.collectionCents + input.amountCents > classification.cashDueCents) {
      throw financeError('FINANCE_CASH_OVER_COLLECTED')
    }

    const created = await transaction.createCollection({
      businessId: input.businessId, orderId: order.id, locationId, collectorId: actor.membershipId,
      kind, amountCents: input.amountCents, idempotencyKey: input.idempotencyKey,
      adjustmentOfId: input.adjustmentOfId ?? null, note: input.note?.trim() || null, now,
    })
    await transaction.createAudit({
      businessId: input.businessId, actorId: input.actorId, actorRole: auditRole(actor.role),
      action: kind === 'ADJUSTMENT' ? 'FINANCE_CASH_ADJUSTED' : 'FINANCE_CASH_COLLECTED',
      details: { collectionId: created.id, orderId: order.id, amountCents: input.amountCents, adjustmentOfId: input.adjustmentOfId ?? null },
    })

    const cashCollectedCents = totals.totalCents + input.amountCents
    return {
      id: created.id, orderId: created.orderId, kind: created.kind, amountCents: created.amountCents,
      cashDueCents: classification.cashDueCents, cashCollectedCents, cashRemainingCents: classification.cashDueCents - cashCollectedCents, createdAt: created.createdAt,
    }
  }, { isolationLevel: 'ReadCommitted' })
}

type CashCollectionRepositoryClient = {
  $transaction<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T>
}

export function createPrismaCashCollectionRepository(client: CashCollectionRepositoryClient): CashCollectionRepository {
  return {
    transaction(work, options) {
      return client.$transaction(async (transaction) => work({
        async getActorAccess({ actorId, businessId }) {
          const membership = await transaction.businessMembership.findFirst({ where: { businessId, userId: actorId, active: true }, select: { id: true, businessId: true, role: true, active: true, Locations: { select: { locationId: true } } } })
          return membership ? { membershipId: membership.id, businessId: membership.businessId, role: membership.role, active: membership.active, assignedLocationIds: membership.Locations.map(({ locationId }) => locationId) } : null
        },
        async lockOrder({ orderId, businessId }) {
          const locked = await transaction.$queryRaw<Array<{ id: string }>>`SELECT id FROM BookingOrder WHERE id = ${orderId} AND businessId = ${businessId} FOR UPDATE`
          if (!locked.length) return null
          const order = await transaction.bookingOrder.findUnique({
            where: { id: orderId },
            select: { id: true, businessId: true, status: true, paymentChoice: true, Segments: { select: { locationId: true, status: true, priceCents: true, offering: { select: { depositKind: true, depositValue: true } } } } },
          })
          if (!order || order.businessId !== businessId) return null
          return { id: order.id, businessId: order.businessId, status: order.status, paymentChoice: order.paymentChoice, segments: order.Segments.map((segment) => ({ locationId: segment.locationId, status: segment.status, priceCents: segment.priceCents, depositKind: segment.offering.depositKind, depositValue: segment.offering.depositValue })) }
        },
        findExistingByIdempotencyKey: ({ businessId, idempotencyKey }) => transaction.cashCollection.findUnique({ where: { businessId_idempotencyKey: { businessId, idempotencyKey } } }),
        async findAdjustmentTarget({ id, orderId }) {
          const target = await transaction.cashCollection.findFirst({ where: { id, orderId }, select: { id: true } })
          return target
        },
        async sumCollectedCents({ orderId }) {
          const rows = await transaction.cashCollection.findMany({ where: { orderId }, select: { amountCents: true, kind: true } })
          return {
            collectionCents: rows.filter((row) => row.kind === 'COLLECTION').reduce((sum, row) => sum + row.amountCents, 0),
            totalCents: rows.reduce((sum, row) => sum + row.amountCents, 0),
          }
        },
        createCollection: (input) => transaction.cashCollection.create({ data: { businessId: input.businessId, orderId: input.orderId, locationId: input.locationId, collectorId: input.collectorId, kind: input.kind, amountCents: input.amountCents, idempotencyKey: input.idempotencyKey, adjustmentOfId: input.adjustmentOfId, note: input.note } }),
        async createAudit(input) {
          await transaction.auditLog.create({ data: { actorId: input.actorId, actorRole: input.actorRole, action: input.action, details: { businessId: input.businessId, ...input.details } } })
        },
      }), options)
    },
  }
}

const defaultRepository = createPrismaCashCollectionRepository(prisma)
