import { Card } from '@/components/ui/Card'
import type { FinanceLedgerModel } from '@/modules/finance/ledger'

function money(cents: number) {
  return `EC$${(cents / 100).toFixed(2)}`
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <Card className="p-5">
    <p className="text-sm text-cocoa-600">{label}</p>
    <p className="mt-2 font-display text-3xl text-cocoa-950">{value}</p>
    {hint ? <p className="mt-1 text-xs text-cocoa-500">{hint}</p> : null}
  </Card>
}

export function FinanceSummary({ summary }: { summary: FinanceLedgerModel['summary'] }) {
  return <section aria-label="Finance summary" className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Metric label="Booked revenue" value={money(summary.bookedRevenueCents)} hint="Confirmed and requested bookings not yet completed." />
      <Metric label="Completed revenue" value={money(summary.completedRevenueCents)} hint="Appointments marked completed." />
      <Metric label="Cancelled revenue (excluded)" value={money(summary.cancelledRevenueCents)} hint="Excluded from the earned totals above." />
      <Metric label="Cash due at appointment" value={money(summary.cashDueCents)} />
      <Metric label="Cash collected" value={money(summary.cashCollectedCents)} hint="Recorded, audited cash evidence only." />
      <Metric label="Cash remaining" value={money(summary.cashRemainingCents)} />
    </div>
    <Card className="p-5">
      <p className="font-semibold text-cocoa-950">Pending online payment requests</p>
      <p className="mt-2 font-display text-2xl text-cocoa-950">{summary.pendingOnlinePaymentRequests} · {money(summary.pendingOnlinePaymentCents)}</p>
      <p className="mt-2 text-sm text-cocoa-600">No live payment provider is connected yet. These amounts are provider-neutral pending records, not captured funds — nothing here has been charged, settled, or refunded automatically.</p>
    </Card>
  </section>
}
