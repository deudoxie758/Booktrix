import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import type { FinanceLedgerModel, FinanceLedgerRow } from '@/modules/finance/ledger'
import { CashAdjustmentForm } from './CashAdjustmentForm'
import { CashCollectionForm, type CashCollectionAction } from './CashCollectionForm'
import { financeQueryString } from './FinanceFilters'

function money(cents: number) {
  return `EC$${(cents / 100).toFixed(2)}`
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat('en-LC', { timeZone: 'America/St_Lucia', dateStyle: 'medium', timeStyle: 'short' }).format(value)
}

const statusLabels: Record<string, string> = { PAYMENT_PENDING: 'Payment pending', REQUESTED: 'Requested', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', PARTIALLY_CANCELLED: 'Partially cancelled', CANCELLED: 'Cancelled' }

function onlineLabel(row: FinanceLedgerRow) {
  if (row.onlineStatus === 'PENDING') return `Pending ${money(row.onlineAmountCents)}`
  if (row.onlineStatus === 'NONE') return 'Not applicable'
  return row.onlineStatus
}

function moneySigned(cents: number) {
  const sign = cents < 0 ? '-' : ''
  return `${sign}EC$${(Math.abs(cents) / 100).toFixed(2)}`
}

function CollectionControl({ row, role, action }: { row: FinanceLedgerRow; role: string; action?: CashCollectionAction }) {
  if (!action || (role !== 'OWNER' && role !== 'ACCOUNTS')) return null
  // A negative remaining figure is a real reconciliation state (e.g. a segment
  // was cancelled after cash was already collected against it) — surface it
  // truthfully rather than crashing, clamping it to zero, or silently
  // offering to collect more cash that is not due.
  if (row.cashRemainingCents < 0) return <p className="text-xs font-semibold text-danger">Overcollected by {moneySigned(Math.abs(row.cashRemainingCents))}. No further cash is due.</p>
  if (row.cashRemainingCents === 0) return <p className="text-xs font-semibold text-cocoa-500">No cash due.</p>
  return <details className="rounded-xl border border-sand-200 p-3">
    <summary className="cursor-pointer text-sm font-semibold text-cocoa-900">Record cash collected</summary>
    <div className="mt-3"><CashCollectionForm orderId={row.orderId} cashRemainingCents={row.cashRemainingCents} action={action} /></div>
  </details>
}

function CollectionHistory({ row, role, action }: { row: FinanceLedgerRow; role: string; action?: CashCollectionAction }) {
  if (!action || (role !== 'OWNER' && role !== 'ACCOUNTS') || !row.collections.length) return null
  return <div className="space-y-2">
    <p className="text-xs font-bold uppercase tracking-[.08em] text-cocoa-600">Cash evidence</p>
    <ul className="space-y-2">
      {row.collections.map((collection) => <li key={collection.id} className="rounded-xl border border-sand-200 p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-cocoa-900">{collection.kind === 'ADJUSTMENT' ? 'Correction' : 'Collected'} {moneySigned(collection.amountCents)}</span>
          <span className="text-cocoa-500">{dateTime(collection.createdAt)}</span>
        </div>
        {collection.note ? <p className="mt-1 text-cocoa-600">{collection.note}</p> : null}
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold text-cocoa-900">Correct this entry</summary>
          <div className="mt-2"><CashAdjustmentForm orderId={row.orderId} collectionId={collection.id} action={action} /></div>
        </details>
      </li>)}
    </ul>
  </div>
}

export function FinanceLedger({ model, role, collectAction }: { model: FinanceLedgerModel; role: string; collectAction?: CashCollectionAction }) {
  return <section aria-label="Finance ledger" className="space-y-4">
    <div className="hidden overflow-x-auto rounded-2xl border border-sand-200 bg-white md:block">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-sand-50 text-xs font-bold uppercase tracking-[.08em] text-cocoa-600">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Cash due</th>
            <th className="px-4 py-3">Cash collected</th>
            <th className="px-4 py-3">Online</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row) => <tr key={row.orderId} className="border-t border-sand-100 align-top">
            <td className="px-4 py-3"><p className="font-mono text-xs">{row.orderId}</p><p className="text-xs text-cocoa-500">{dateTime(row.createdAt)}</p></td>
            <td className="px-4 py-3">{row.customerName}</td>
            <td className="px-4 py-3">{row.locationName}</td>
            <td className="px-4 py-3">{statusLabels[row.status] ?? row.status}</td>
            <td className="px-4 py-3">{money(row.cashDueCents)}</td>
            <td className="px-4 py-3">{money(row.cashCollectedCents)}</td>
            <td className="px-4 py-3">{onlineLabel(row)}</td>
            <td className="px-4 py-3 space-y-3">
              <CollectionControl row={row} role={role} action={collectAction} />
              <CollectionHistory row={row} role={role} action={collectAction} />
            </td>
          </tr>)}
        </tbody>
      </table>
      {!model.rows.length ? <p className="p-5 text-sm text-cocoa-600">No bookings match the current filters.</p> : null}
    </div>

    <ul aria-label="Finance ledger (mobile view)" className="space-y-3 md:hidden">
      {model.rows.map((row) => <li key={row.orderId}>
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-cocoa-950">{row.customerName}</p>
            <span className="text-xs font-bold uppercase tracking-[.08em] text-clay-600">{statusLabels[row.status] ?? row.status}</span>
          </div>
          <p className="text-xs text-cocoa-500">{dateTime(row.createdAt)} · {row.locationName}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-cocoa-500">Cash due</dt><dd className="font-semibold text-cocoa-900">{money(row.cashDueCents)}</dd></div>
            <div><dt className="text-cocoa-500">Cash collected</dt><dd className="font-semibold text-cocoa-900">{money(row.cashCollectedCents)}</dd></div>
          </dl>
          <p className="text-xs text-cocoa-600">Online: {onlineLabel(row)}</p>
          <CollectionControl row={row} role={role} action={collectAction} />
          <CollectionHistory row={row} role={role} action={collectAction} />
        </Card>
      </li>)}
      {!model.rows.length ? <li className="text-sm text-cocoa-600">No bookings match the current filters.</li> : null}
    </ul>

    {model.totalPages > 1 ? <nav aria-label="Finance ledger pages" className="flex items-center justify-between text-sm font-semibold text-cocoa-700">
      <Link aria-disabled={model.page <= 1} className={`rounded-full border border-sand-300 px-4 py-2 ${model.page <= 1 ? 'pointer-events-none opacity-40' : ''}`} href={`?${financeQueryString(model.filters, { page: model.page - 1 })}`}>Previous</Link>
      <span>Page {model.page} of {model.totalPages}</span>
      <Link aria-disabled={model.page >= model.totalPages} className={`rounded-full border border-sand-300 px-4 py-2 ${model.page >= model.totalPages ? 'pointer-events-none opacity-40' : ''}`} href={`?${financeQueryString(model.filters, { page: model.page + 1 })}`}>Next</Link>
    </nav> : null}
  </section>
}
