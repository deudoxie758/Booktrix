export const financeError = (code: string) => Object.assign(new Error(code), { code })

export const FINANCE_STATUS_VALUES = ['ALL', 'PAYMENT_PENDING', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'PARTIALLY_CANCELLED', 'CANCELLED'] as const
export const FINANCE_PAYMENT_STATE_VALUES = ['ALL', 'CASH_DUE', 'CASH_COLLECTED', 'ONLINE_PENDING'] as const

export type FinanceStatusFilter = (typeof FINANCE_STATUS_VALUES)[number]
export type FinancePaymentStateFilter = (typeof FINANCE_PAYMENT_STATE_VALUES)[number]

export type FinanceRawFilterInput = {
  fromDate?: string | null
  toDate?: string | null
  locationId?: string | null
  status?: string | null
  paymentState?: string | null
  page?: string | number | null
}

export type FinanceFilters = {
  from: Date | null
  to: Date | null
  locationId: string | null
  status: FinanceStatusFilter
  paymentState: FinancePaymentStateFilter
  page: number
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/

/** Saint Lucia observes no DST and is a fixed UTC-4 offset year-round. */
export function saintLuciaDateRange(value: string) {
  if (!datePattern.test(value)) throw financeError('FINANCE_FILTER_INVALID_DATE')
  const [year, month, day] = value.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0))
  if (Number.isNaN(start.getTime()) || start.getUTCMonth() !== month - 1) throw financeError('FINANCE_FILTER_INVALID_DATE')
  return { start, end: new Date(start.getTime() + 86_400_000) }
}

function parseEnum<T extends string>(value: string | null | undefined, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback
}

export function parseFinanceFilters(input: FinanceRawFilterInput, authorizedLocationIds: string[]): FinanceFilters {
  const from = input.fromDate ? saintLuciaDateRange(input.fromDate).start : null
  const to = input.toDate ? saintLuciaDateRange(input.toDate).end : null
  if (from && to && from.getTime() >= to.getTime()) throw financeError('FINANCE_FILTER_RANGE_INVALID')

  const locationId = input.locationId && input.locationId !== 'ALL' ? input.locationId : null
  if (locationId && !authorizedLocationIds.includes(locationId)) throw financeError('FINANCE_LOCATION_DENIED')

  const status = parseEnum(input.status, FINANCE_STATUS_VALUES, 'ALL')
  const paymentState = parseEnum(input.paymentState, FINANCE_PAYMENT_STATE_VALUES, 'ALL')

  const pageRaw = typeof input.page === 'string' ? Number(input.page) : input.page
  const page = Number.isInteger(pageRaw) && (pageRaw as number) > 0 ? (pageRaw as number) : 1

  return { from, to, locationId, status, paymentState, page }
}
