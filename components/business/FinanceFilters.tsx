import Link from 'next/link'
import { FINANCE_PAYMENT_STATE_VALUES, FINANCE_STATUS_VALUES, type FinanceFilters as FinanceFiltersModel } from '@/modules/finance/filters'
import type { FinanceLedgerModel } from '@/modules/finance/ledger'

const statusLabels: Record<string, string> = { ALL: 'All statuses', PAYMENT_PENDING: 'Payment pending', REQUESTED: 'Requested', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', PARTIALLY_CANCELLED: 'Partially cancelled', CANCELLED: 'Cancelled' }
const paymentStateLabels: Record<string, string> = { ALL: 'All payment states', CASH_DUE: 'Cash due', CASH_COLLECTED: 'Cash collected', ONLINE_PENDING: 'Online payment pending' }

export function dateInputValue(date: Date | null) {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/St_Lucia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/**
 * Rebuilds the finance ledger's query string from its currently-applied
 * filters, so pagination links and the CSV export link always preserve the
 * exact filters the accounts/owner user is looking at.
 */
export function financeQueryString(filters: FinanceFiltersModel, overrides: { page?: number } = {}) {
  const params = new URLSearchParams()
  const fromDate = dateInputValue(filters.from)
  const toDate = dateInputValue(filters.to ? new Date(filters.to.getTime() - 86_400_000) : null)
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  if (filters.locationId) params.set('locationId', filters.locationId)
  if (filters.status !== 'ALL') params.set('status', filters.status)
  if (filters.paymentState !== 'ALL') params.set('paymentState', filters.paymentState)
  const page = overrides.page ?? filters.page
  if (page && page !== 1) params.set('page', String(page))
  return params.toString()
}

export function FinanceFilters({ model }: { model: FinanceLedgerModel }) {
  const exportHref = `/business/finance/export?${financeQueryString(model.filters)}`
  return <section aria-label="Finance filters" className="space-y-4 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm">
    <form method="get" aria-label="Filter finance ledger" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="block text-sm font-semibold text-cocoa-900" htmlFor="finance-from">From
        <input id="finance-from" name="fromDate" type="date" defaultValue={dateInputValue(model.filters.from)} className="mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-white px-4" />
      </label>
      <label className="block text-sm font-semibold text-cocoa-900" htmlFor="finance-to">To
        <input id="finance-to" name="toDate" type="date" defaultValue={dateInputValue(model.filters.to ? new Date(model.filters.to.getTime() - 86_400_000) : null)} className="mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-white px-4" />
      </label>
      <label className="block text-sm font-semibold text-cocoa-900" htmlFor="finance-location">Location
        <select id="finance-location" name="locationId" defaultValue={model.filters.locationId ?? 'ALL'} className="mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-white px-4">
          <option value="ALL">All authorized locations</option>
          {model.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-cocoa-900" htmlFor="finance-status">Booking status
        <select id="finance-status" name="status" defaultValue={model.filters.status} className="mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-white px-4">
          {FINANCE_STATUS_VALUES.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-cocoa-900" htmlFor="finance-payment-state">Payment state
        <select id="finance-payment-state" name="paymentState" defaultValue={model.filters.paymentState} className="mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-white px-4">
          {FINANCE_PAYMENT_STATE_VALUES.map((value) => <option key={value} value={value}>{paymentStateLabels[value]}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-5">
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-cocoa-900 px-5 py-2.5 text-sm font-semibold text-cream-50">Apply filters</button>
        <Link href={exportHref} className="inline-flex min-h-11 items-center justify-center rounded-full border border-sand-300 px-5 py-2.5 text-sm font-semibold text-cocoa-800">Export CSV</Link>
      </div>
    </form>
  </section>
}
