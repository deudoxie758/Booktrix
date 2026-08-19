import { FinanceFilters } from '@/components/business/FinanceFilters'
import { FinanceLedger } from '@/components/business/FinanceLedger'
import { FinanceSummary } from '@/components/business/FinanceSummary'
import { loadFinanceLedger } from '@/modules/finance/ledger'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import { recordCashCollectionAction } from './actions'

export const dynamic = 'force-dynamic'

type FinanceSearchParams = { fromDate?: string; toDate?: string; locationId?: string; status?: string; paymentState?: string; page?: string }

export default async function FinancePage({ searchParams }: { searchParams: FinanceSearchParams }) {
  const context = await requireWorkspaceRole(['OWNER', 'ACCOUNTS'])
  const model = await loadFinanceLedger({
    actorId: context.actor.id,
    rawFilters: {
      fromDate: searchParams.fromDate ?? null,
      toDate: searchParams.toDate ?? null,
      locationId: searchParams.locationId ?? null,
      status: searchParams.status ?? null,
      paymentState: searchParams.paymentState ?? null,
      page: searchParams.page ?? null,
    },
  })

  return <div className="space-y-8">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Accounts</p>
      <h1 className="mt-2 font-display text-4xl text-cocoa-950">Finance</h1>
      <p className="mt-2 max-w-3xl text-cocoa-600">Canonical booking revenue, cash reconciliation, and pending online-payment requests for your authorized locations. No live payment provider is connected yet — full and deposit online amounts are pending records, not captured funds.</p>
    </header>
    <FinanceSummary summary={model.summary} />
    <FinanceFilters model={model} />
    <FinanceLedger model={model} role={context.membership.role} collectAction={recordCashCollectionAction} />
  </div>
}
