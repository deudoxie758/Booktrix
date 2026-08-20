import { prisma } from '@/lib/prisma'
import { calculatePaymentAmounts } from '@/modules/catalog/payment-options'
import { resolveBusinessContext } from '@/modules/organizations/context'
import { financeError, parseFinanceFilters, type FinanceFilters, type FinanceRawFilterInput } from './filters'

const PAGE_SIZE = 25
const LEDGER_ORDER_STATUSES = ['PAYMENT_PENDING', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'PARTIALLY_CANCELLED', 'CANCELLED']
const FINANCE_ROLES = ['OWNER', 'ACCOUNTS']

type PaymentChoice = 'FULL' | 'DEPOSIT' | 'CASH'
type DepositKind = 'FIXED' | 'PERCENTAGE' | null

export type FinanceSegmentInput = {
  status: string
  priceCents: number
  depositKind?: DepositKind
  depositValue?: number | null
}

export type FinanceOrderClassificationInput = {
  status: string
  paymentChoice: PaymentChoice
  segments: FinanceSegmentInput[]
}

export type FinanceClassification = { bookedCents: number; cancelledCents: number; cashDueCents: number }

/**
 * Splits an order's segment value into earned (booked, which includes
 * completed) revenue vs. cancelled revenue, and computes the cash-at-appointment
 * portion still owed for the earned segments only. Cancelled value is always
 * excluded from earned totals. Rejected (never-confirmed) segments are
 * excluded from both buckets since no revenue was ever committed. A
 * whole-order CANCELLED status overrides any individual segment status.
 */
export function classifyOrderFinance(order: FinanceOrderClassificationInput): FinanceClassification {
  let bookedCents = 0
  let cancelledCents = 0
  let cashDueCents = 0
  for (const segment of order.segments) {
    const cancelled = order.status === 'CANCELLED' || segment.status === 'CANCELLED'
    if (cancelled) {
      cancelledCents += segment.priceCents
      continue
    }
    if (segment.status === 'REJECTED') continue
    bookedCents += segment.priceCents
    const amounts = calculatePaymentAmounts({
      subtotalCents: segment.priceCents,
      choice: order.paymentChoice,
      depositKind: segment.depositKind ?? null,
      depositValue: segment.depositValue ?? null,
    })
    cashDueCents += amounts.dueAtAppointmentCents
  }
  return { bookedCents, cancelledCents, cashDueCents }
}

export type FinanceLocationOption = { id: string; name: string }

export type FinanceLedgerCollection = { id: string; kind: 'COLLECTION' | 'ADJUSTMENT'; amountCents: number; createdAt: Date; note: string | null }

export type FinanceLedgerRow = {
  orderId: string
  createdAt: Date
  customerName: string
  locationId: string
  locationName: string
  status: string
  paymentChoice: PaymentChoice
  subtotalCents: number
  bookedCents: number
  cancelledCents: number
  cashDueCents: number
  cashCollectedCents: number
  cashRemainingCents: number
  onlineStatus: 'NONE' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  onlineAmountCents: number
  /** Individual append-only cash-collection evidence for this order, oldest first,
   *  so the UI can offer a correction (ADJUSTMENT) referencing a specific entry. */
  collections: FinanceLedgerCollection[]
}

export type FinanceSummary = {
  bookedRevenueCents: number
  completedRevenueCents: number
  cancelledRevenueCents: number
  cashDueCents: number
  cashCollectedCents: number
  cashRemainingCents: number
  pendingOnlinePaymentCents: number
  pendingOnlinePaymentRequests: number
}

export type FinanceLedgerModel = {
  business: { id: string; name: string }
  locations: FinanceLocationOption[]
  filters: FinanceFilters
  summary: FinanceSummary
  rows: FinanceLedgerRow[]
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
}

type FinanceContext = { business: { id: string; name: string }; membership: { id: string; role: string }; availableLocations: FinanceLocationOption[] }

type RawFinanceOrder = {
  id: string
  status: string
  paymentChoice: PaymentChoice
  subtotalCents: number
  createdAt: Date
  customerName: string | null
  customer: { name: string | null } | null
  PaymentRequest: { status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'; amountCents: number } | null
  Segments: Array<{ locationId: string; status: string; priceCents: number; offering: { depositKind: DepositKind; depositValue: number | null } }>
  CashCollections: Array<{ id: string; amountCents: number; kind: 'COLLECTION' | 'ADJUSTMENT'; createdAt: Date; note: string | null }>
}

async function resolveFinanceContext(actorId: string): Promise<FinanceContext> {
  const context = await resolveBusinessContext(actorId)
  if (!FINANCE_ROLES.includes(context.membership.role)) throw financeError('FINANCE_ACCESS_DENIED')
  return { business: context.business, membership: context.membership, availableLocations: context.availableLocations }
}

async function queryFinanceOrders(context: FinanceContext, filters: FinanceFilters, db: any): Promise<RawFinanceOrder[]> {
  const authorizedLocationIds = context.availableLocations.map((location) => location.id)
  const scopeLocationIds = filters.locationId ? [filters.locationId] : authorizedLocationIds
  const dateFilter = filters.from || filters.to ? { startsAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } } : {}
  return db.bookingOrder.findMany({
    where: {
      businessId: context.business.id,
      status: { in: LEDGER_ORDER_STATUSES },
      Segments: { some: { locationId: { in: scopeLocationIds }, ...dateFilter }, none: { locationId: { notIn: authorizedLocationIds } } },
    },
    select: {
      id: true, status: true, paymentChoice: true, subtotalCents: true, createdAt: true, customerName: true,
      customer: { select: { name: true } },
      PaymentRequest: { select: { status: true, amountCents: true } },
      Segments: { select: { locationId: true, status: true, priceCents: true, offering: { select: { depositKind: true, depositValue: true } } } },
      CashCollections: { select: { id: true, amountCents: true, kind: true, createdAt: true, note: true }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

function buildRow(order: RawFinanceOrder, locations: FinanceLocationOption[]): FinanceLedgerRow {
  const classification = classifyOrderFinance({
    status: order.status,
    paymentChoice: order.paymentChoice,
    segments: order.Segments.map((segment) => ({ status: segment.status, priceCents: segment.priceCents, depositKind: segment.offering.depositKind, depositValue: segment.offering.depositValue })),
  })
  const cashCollectedCents = order.CashCollections.reduce((sum, collection) => sum + collection.amountCents, 0)
  const locationId = order.Segments[0]?.locationId ?? ''
  const onlineStatus = order.PaymentRequest?.status ?? 'NONE'
  return {
    orderId: order.id,
    createdAt: order.createdAt,
    customerName: order.customer?.name ?? order.customerName ?? 'Walk-in customer',
    locationId,
    locationName: locations.find((location) => location.id === locationId)?.name ?? 'Unassigned location',
    status: order.status,
    paymentChoice: order.paymentChoice,
    subtotalCents: order.subtotalCents,
    bookedCents: classification.bookedCents,
    cancelledCents: classification.cancelledCents,
    cashDueCents: classification.cashDueCents,
    cashCollectedCents,
    cashRemainingCents: classification.cashDueCents - cashCollectedCents,
    onlineStatus,
    onlineAmountCents: onlineStatus === 'PENDING' ? (order.PaymentRequest?.amountCents ?? 0) : 0,
    collections: order.CashCollections.map((collection) => ({ id: collection.id, kind: collection.kind, amountCents: collection.amountCents, createdAt: collection.createdAt, note: collection.note })),
  }
}

function buildSummary(scopedRows: FinanceLedgerRow[]): FinanceSummary {
  const completed = scopedRows.filter((row) => row.status === 'COMPLETED')
  const booked = scopedRows.filter((row) => row.status !== 'COMPLETED' && row.status !== 'CANCELLED')
  const pending = scopedRows.filter((row) => row.onlineStatus === 'PENDING')
  return {
    bookedRevenueCents: booked.reduce((sum, row) => sum + row.bookedCents, 0),
    completedRevenueCents: completed.reduce((sum, row) => sum + row.bookedCents, 0),
    cancelledRevenueCents: scopedRows.reduce((sum, row) => sum + row.cancelledCents, 0),
    cashDueCents: scopedRows.reduce((sum, row) => sum + row.cashDueCents, 0),
    cashCollectedCents: scopedRows.reduce((sum, row) => sum + row.cashCollectedCents, 0),
    cashRemainingCents: scopedRows.reduce((sum, row) => sum + row.cashRemainingCents, 0),
    pendingOnlinePaymentCents: pending.reduce((sum, row) => sum + row.onlineAmountCents, 0),
    pendingOnlinePaymentRequests: pending.length,
  }
}

function matchesStatus(row: FinanceLedgerRow, status: FinanceFilters['status']) {
  return status === 'ALL' || row.status === status
}

function matchesPaymentState(row: FinanceLedgerRow, paymentState: FinanceFilters['paymentState']) {
  if (paymentState === 'ALL') return true
  if (paymentState === 'CASH_DUE') return row.cashRemainingCents > 0
  if (paymentState === 'CASH_COLLECTED') return row.cashCollectedCents > 0
  return row.onlineStatus === 'PENDING'
}

type Dependencies = { resolveContext(actorId: string): Promise<FinanceContext>; queryOrders(context: FinanceContext, filters: FinanceFilters, db: any): Promise<RawFinanceOrder[]> }
const defaults: Dependencies = { resolveContext: resolveFinanceContext, queryOrders: queryFinanceOrders }

export type FinanceLedgerInput = { actorId: string; now?: Date; rawFilters: FinanceRawFilterInput; unpaged?: boolean }

export async function loadFinanceLedger(input: FinanceLedgerInput, dependencies: Partial<Dependencies> = {}, db: any = prisma): Promise<FinanceLedgerModel> {
  const resolved = { ...defaults, ...dependencies }
  const context = await resolved.resolveContext(input.actorId)
  const authorizedLocationIds = context.availableLocations.map((location) => location.id)
  const filters = parseFinanceFilters(input.rawFilters, authorizedLocationIds)
  const orders = await resolved.queryOrders(context, filters, db)

  const scopedRows = orders.map((order) => buildRow(order, context.availableLocations)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const summary = buildSummary(scopedRows)
  const displayRows = scopedRows.filter((row) => matchesStatus(row, filters.status) && matchesPaymentState(row, filters.paymentState))

  const totalRows = displayRows.length
  if (input.unpaged) {
    return { business: context.business, locations: context.availableLocations, filters, summary, rows: displayRows, page: 1, pageSize: totalRows || 1, totalRows, totalPages: 1 }
  }
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const page = Math.min(filters.page, totalPages)
  const rows = displayRows.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  return { business: context.business, locations: context.availableLocations, filters, summary, rows, page, pageSize: PAGE_SIZE, totalRows, totalPages }
}

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

function escapeCsvCell(value: string | number): string {
  let text = String(value)
  if (FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))) text = `'${text}`
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

const CSV_HEADER = ['Order ID', 'Created at', 'Customer', 'Location', 'Status', 'Payment choice', 'Subtotal (XCD)', 'Cash due (XCD)', 'Cash collected (XCD)', 'Cash remaining (XCD)', 'Online payment status', 'Online amount (XCD)']

function money(cents: number) {
  return (cents / 100).toFixed(2)
}

export function createFinanceCsv(model: FinanceLedgerModel): string {
  const rows = model.rows.map((row) => [
    row.orderId,
    row.createdAt.toISOString(),
    row.customerName,
    row.locationName,
    row.status,
    row.paymentChoice,
    money(row.subtotalCents),
    money(row.cashDueCents),
    money(row.cashCollectedCents),
    money(row.cashRemainingCents),
    row.onlineStatus,
    money(row.onlineAmountCents),
  ])
  return [CSV_HEADER, ...rows].map((cells) => cells.map(escapeCsvCell).join(',')).join('\r\n') + '\r\n'
}
