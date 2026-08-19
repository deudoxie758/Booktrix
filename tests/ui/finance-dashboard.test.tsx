import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CashAdjustmentForm } from '@/components/business/CashAdjustmentForm'
import { CashCollectionForm, type CashCollectionActionResult } from '@/components/business/CashCollectionForm'
import { FinanceFilters, financeQueryString } from '@/components/business/FinanceFilters'
import { FinanceLedger } from '@/components/business/FinanceLedger'
import { FinanceSummary } from '@/components/business/FinanceSummary'
import type { FinanceLedgerModel } from '@/modules/finance/ledger'

const now = new Date('2026-08-19T18:00:00.000Z')

function baseModel(overrides: Partial<FinanceLedgerModel> = {}): FinanceLedgerModel {
  return {
    business: { id: 'business-1', name: 'Island Glow' },
    locations: [{ id: 'castries', name: 'Castries' }, { id: 'soufriere', name: 'Soufrière' }],
    filters: { from: null, to: null, locationId: null, status: 'ALL', paymentState: 'ALL', page: 1 },
    summary: { bookedRevenueCents: 12000, completedRevenueCents: 9000, cancelledRevenueCents: 5000, cashDueCents: 12000, cashCollectedCents: 4000, cashRemainingCents: 8000, pendingOnlinePaymentCents: 3000, pendingOnlinePaymentRequests: 1 },
    rows: [{
      orderId: 'order-1', createdAt: now, customerName: 'Kai Joseph', locationId: 'castries', locationName: 'Castries', status: 'CONFIRMED', paymentChoice: 'CASH',
      subtotalCents: 12000, bookedCents: 12000, cancelledCents: 0, cashDueCents: 12000, cashCollectedCents: 4000, cashRemainingCents: 8000, onlineStatus: 'NONE', onlineAmountCents: 0,
      collections: [{ id: 'collection-1', kind: 'COLLECTION', amountCents: 4000, createdAt: now, note: null }],
    }],
    page: 1, pageSize: 25, totalRows: 1, totalPages: 1,
    ...overrides,
  }
}

describe('FinanceSummary', () => {
  it('shows real summary labels and truthful pending-provider copy', () => {
    render(<FinanceSummary summary={baseModel().summary} />)

    expect(screen.getByText('Booked revenue')).toBeVisible()
    expect(screen.getByText('Completed revenue')).toBeVisible()
    expect(screen.getByText(/cancelled/i)).toBeVisible()
    expect(screen.getAllByText('EC$120.00').length).toBeGreaterThan(0)
    expect(screen.getByText(/no live payment provider is connected/i)).toBeVisible()
    expect(screen.getByText(/not captured funds/i)).toBeVisible()
  })
})

describe('FinanceFilters', () => {
  it('exposes accessible filter controls seeded from current filters', () => {
    const model = baseModel({ filters: { from: new Date('2026-08-19T04:00:00.000Z'), to: new Date('2026-08-20T04:00:00.000Z'), locationId: 'castries', status: 'CONFIRMED', paymentState: 'CASH_DUE', page: 1 } })
    render(<FinanceFilters model={model} />)

    expect(screen.getByLabelText(/^from/i)).toHaveValue('2026-08-19')
    expect(screen.getByLabelText(/^to/i)).toHaveValue('2026-08-19')
    expect(screen.getByLabelText(/location/i)).toHaveValue('castries')
    expect(screen.getByLabelText(/booking status/i)).toHaveValue('CONFIRMED')
    expect(screen.getByLabelText(/payment state/i)).toHaveValue('CASH_DUE')
  })

  it('preserves the current filters in the CSV export link', () => {
    const model = baseModel({ filters: { from: new Date('2026-08-19T04:00:00.000Z'), to: null, locationId: 'castries', status: 'CONFIRMED', paymentState: 'ALL', page: 2 } })
    render(<FinanceFilters model={model} />)

    const exportLink = screen.getByRole('link', { name: /export csv/i })
    const href = exportLink.getAttribute('href')!
    expect(href).toContain('fromDate=2026-08-19')
    expect(href).toContain('locationId=castries')
    expect(href).toContain('status=CONFIRMED')
    expect(href).not.toContain('paymentState=')
  })

  it('round-trips date/location/status/page query preservation via financeQueryString', () => {
    const query = financeQueryString({ from: new Date('2026-08-19T04:00:00.000Z'), to: new Date('2026-08-20T04:00:00.000Z'), locationId: 'castries', status: 'CANCELLED', paymentState: 'ONLINE_PENDING', page: 3 })
    expect(query).toBe('fromDate=2026-08-19&toDate=2026-08-19&locationId=castries&status=CANCELLED&paymentState=ONLINE_PENDING&page=3')
  })
})

describe('FinanceLedger', () => {
  it('renders both a desktop table and accessible mobile cards for the same rows', () => {
    render(<FinanceLedger model={baseModel()} role="OWNER" />)

    expect(within(screen.getByRole('table')).getByText('Kai Joseph')).toBeVisible()
    expect(within(screen.getByLabelText(/mobile view/i)).getByText('Kai Joseph')).toBeVisible()
  })

  it('shows a no-results message when no rows match the current filters', () => {
    render(<FinanceLedger model={baseModel({ rows: [], totalRows: 0 })} role="OWNER" />)
    expect(screen.getAllByText(/no bookings match/i).length).toBeGreaterThan(0)
  })

  it('shows Accounts and Owner collection controls but denies Manager', () => {
    const action = vi.fn()
    const { rerender } = render(<FinanceLedger model={baseModel()} role="ACCOUNTS" collectAction={action} />)
    expect(screen.getAllByText(/record cash collected/i).length).toBeGreaterThan(0)

    rerender(<FinanceLedger model={baseModel()} role="OWNER" collectAction={action} />)
    expect(screen.getAllByText(/record cash collected/i).length).toBeGreaterThan(0)

    rerender(<FinanceLedger model={baseModel()} role="MANAGER" collectAction={action} />)
    expect(screen.queryByText(/record cash collected/i)).not.toBeInTheDocument()
  })

  it('does not render a collection control once cash is fully collected', () => {
    const model = baseModel({ rows: [{ ...baseModel().rows[0], cashRemainingCents: 0 }] })
    render(<FinanceLedger model={model} role="OWNER" collectAction={vi.fn()} />)
    expect(screen.queryByText(/record cash collected/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/no cash due/i).length).toBeGreaterThan(0)
  })

  it('renders semantic pagination that preserves filters across pages', () => {
    const model = baseModel({ page: 2, totalPages: 3, filters: { from: null, to: null, locationId: 'castries', status: 'ALL', paymentState: 'ALL', page: 2 } })
    render(<FinanceLedger model={model} role="OWNER" />)

    const nav = screen.getByRole('navigation', { name: /finance ledger pages/i })
    expect(within(nav).getByText('Page 2 of 3')).toBeVisible()
    expect(within(nav).getByRole('link', { name: /previous/i }).getAttribute('href')).toContain('locationId=castries')
    expect(within(nav).getByRole('link', { name: /next/i }).getAttribute('href')).toContain('page=3')
  })

  it('shows a negative cash-remaining figure truthfully instead of crashing, clamping, or hiding it', () => {
    // Documents the reconciliation edge case: a segment cancelled after cash was
    // already collected against it drives cashRemainingCents negative (see
    // tests/finance/ledger.test.ts for the domain-level scenario). The UI must
    // not crash and must not silently offer to "collect" more cash for it.
    const model = baseModel({ rows: [{ ...baseModel().rows[0], cashDueCents: 0, cashRemainingCents: -8000 }] })
    render(<FinanceLedger model={model} role="OWNER" collectAction={vi.fn()} />)

    expect(screen.queryByText(/^record cash collected$/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/overcollected/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/80\.00/).length).toBeGreaterThan(0)
  })

  it('lists cash-collection evidence per order and lets Owner/Accounts open a correction form for a specific entry, denied for Manager', () => {
    const action = vi.fn()
    const { rerender } = render(<FinanceLedger model={baseModel()} role="ACCOUNTS" collectAction={action} />)
    expect(screen.getAllByText(/correct this entry/i).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByText(/correct this entry/i)[0])
    expect(screen.getAllByRole('form', { name: /correct cash evidence/i }).length).toBeGreaterThan(0)

    rerender(<FinanceLedger model={baseModel()} role="MANAGER" collectAction={action} />)
    expect(screen.queryByText(/correct this entry/i)).not.toBeInTheDocument()
  })
})

describe('CashCollectionForm', () => {
  it('submits a positive integer cent amount with a fresh idempotency key and announces success', async () => {
    const action = vi.fn(async (_formData: FormData): Promise<CashCollectionActionResult> => ({ ok: true, cashCollectedCents: 5000, cashRemainingCents: 3000 }))
    render(<CashCollectionForm orderId="order-1" cashRemainingCents={8000} action={action} />)

    fireEvent.change(screen.getByLabelText(/amount collected/i), { target: { value: '50.00' } })
    fireEvent.submit(screen.getByRole('form', { name: /record cash collected/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('30.00')
    const formData = action.mock.calls[0][0] as FormData
    expect(formData.get('amountCents')).toBe('5000')
    expect(formData.get('orderId')).toBe('order-1')
    expect(String(formData.get('idempotencyKey'))).toHaveLength(36)
  })

  it('rejects a zero or negative amount before calling the action', async () => {
    const action = vi.fn()
    render(<CashCollectionForm orderId="order-1" cashRemainingCents={8000} action={action} />)

    fireEvent.change(screen.getByLabelText(/amount collected/i), { target: { value: '0' } })
    fireEvent.submit(screen.getByRole('form', { name: /record cash collected/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/greater than zero/i)
    expect(action).not.toHaveBeenCalled()
  })

  it('surfaces a semantic error and blocks duplicate submission while pending', async () => {
    let resolveAction: ((value: CashCollectionActionResult) => void) | undefined
    const action = vi.fn(() => new Promise<CashCollectionActionResult>((resolve) => { resolveAction = resolve }))
    render(<CashCollectionForm orderId="order-1" cashRemainingCents={8000} action={action} />)

    fireEvent.change(screen.getByLabelText(/amount collected/i), { target: { value: '80.00' } })
    const form = screen.getByRole('form', { name: /record cash collected/i })
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(action).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /recording/i })).toBeDisabled()
    resolveAction?.({ ok: false, error: 'This would collect more cash than remains due for this booking.' })
    expect(await screen.findByRole('alert')).toHaveTextContent('collect more cash than remains due')
  })

  it('reuses the same idempotency key across a retry after a dropped/failed response, so a duplicate collection cannot be recorded server-side', async () => {
    const action = vi.fn()
      .mockImplementationOnce(async () => { throw new Error('network error, response lost') })
      .mockImplementationOnce(async (): Promise<CashCollectionActionResult> => ({ ok: true, cashCollectedCents: 8000, cashRemainingCents: 0 }))
    render(<CashCollectionForm orderId="order-1" cashRemainingCents={8000} action={action} />)

    const form = screen.getByRole('form', { name: /record cash collected/i })
    fireEvent.change(screen.getByLabelText(/amount collected/i), { target: { value: '80.00' } })
    fireEvent.submit(form)
    await screen.findByRole('alert')

    fireEvent.submit(form)
    await screen.findByRole('status')

    expect(action).toHaveBeenCalledTimes(2)
    const firstKey = (action.mock.calls[0][0] as FormData).get('idempotencyKey')
    const secondKey = (action.mock.calls[1][0] as FormData).get('idempotencyKey')
    expect(secondKey).toBe(firstKey)
  })

  it('rotates the idempotency key after a successful submission so the next distinct attempt gets a fresh key', async () => {
    const action = vi.fn(async (_formData: FormData): Promise<CashCollectionActionResult> => ({ ok: true, cashCollectedCents: 3000, cashRemainingCents: 5000 }))
    render(<CashCollectionForm orderId="order-1" cashRemainingCents={8000} action={action} />)

    const form = screen.getByRole('form', { name: /record cash collected/i })
    const amountField = screen.getByLabelText(/amount collected/i)
    fireEvent.change(amountField, { target: { value: '30.00' } })
    fireEvent.submit(form)
    await screen.findByRole('status')

    fireEvent.change(amountField, { target: { value: '20.00' } })
    fireEvent.submit(form)
    await screen.findByRole('status')

    const firstKey = (action.mock.calls[0][0] as FormData).get('idempotencyKey')
    const secondKey = (action.mock.calls[1][0] as FormData).get('idempotencyKey')
    expect(secondKey).not.toBe(firstKey)
  })

  it('rotates the idempotency key after a definitive business rejection, since the server told us nothing was persisted', async () => {
    const action = vi.fn(async (_formData: FormData): Promise<CashCollectionActionResult> => ({ ok: false, error: 'This would collect more cash than remains due for this booking.' }))
    render(<CashCollectionForm orderId="order-1" cashRemainingCents={8000} action={action} />)

    const form = screen.getByRole('form', { name: /record cash collected/i })
    const amountField = screen.getByLabelText(/amount collected/i)
    fireEvent.change(amountField, { target: { value: '80.00' } })
    fireEvent.submit(form)
    await screen.findByRole('alert')

    fireEvent.change(amountField, { target: { value: '10.00' } })
    fireEvent.submit(form)
    await screen.findByRole('alert')

    const firstKey = (action.mock.calls[0][0] as FormData).get('idempotencyKey')
    const secondKey = (action.mock.calls[1][0] as FormData).get('idempotencyKey')
    expect(secondKey).not.toBe(firstKey)
  })
})

describe('CashAdjustmentForm', () => {
  it('submits a signed correction delta with a required reason, referencing the original collection', async () => {
    const action = vi.fn(async (_formData: FormData): Promise<CashCollectionActionResult> => ({ ok: true, cashCollectedCents: 3000, cashRemainingCents: 5000 }))
    render(<CashAdjustmentForm orderId="order-1" collectionId="collection-1" action={action} />)

    fireEvent.change(screen.getByLabelText(/correction amount/i), { target: { value: '-20.00' } })
    fireEvent.change(screen.getByLabelText(/reason for this correction/i), { target: { value: 'Recorded $50 by mistake; actually $30.' } })
    fireEvent.submit(screen.getByRole('form', { name: /correct cash evidence/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('50.00')
    const formData = action.mock.calls[0][0] as FormData
    expect(formData.get('amountCents')).toBe('-2000')
    expect(formData.get('adjustmentOfId')).toBe('collection-1')
    expect(formData.get('orderId')).toBe('order-1')
    expect(formData.get('note')).toBe('Recorded $50 by mistake; actually $30.')
  })

  it('rejects a zero-amount correction before calling the action', async () => {
    const action = vi.fn()
    render(<CashAdjustmentForm orderId="order-1" collectionId="collection-1" action={action} />)

    fireEvent.change(screen.getByLabelText(/correction amount/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/reason for this correction/i), { target: { value: 'test' } })
    fireEvent.submit(screen.getByRole('form', { name: /correct cash evidence/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/non-zero/i)
    expect(action).not.toHaveBeenCalled()
  })

  it('requires a reason before calling the action', async () => {
    const action = vi.fn()
    render(<CashAdjustmentForm orderId="order-1" collectionId="collection-1" action={action} />)

    fireEvent.change(screen.getByLabelText(/correction amount/i), { target: { value: '-10.00' } })
    fireEvent.submit(screen.getByRole('form', { name: /correct cash evidence/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/reason/i)
    expect(action).not.toHaveBeenCalled()
  })

  it('reuses the same idempotency key across a dropped-response retry', async () => {
    const action = vi.fn()
      .mockImplementationOnce(async () => { throw new Error('network error, response lost') })
      .mockImplementationOnce(async (): Promise<CashCollectionActionResult> => ({ ok: true, cashCollectedCents: 3000, cashRemainingCents: 5000 }))
    render(<CashAdjustmentForm orderId="order-1" collectionId="collection-1" action={action} />)

    fireEvent.change(screen.getByLabelText(/correction amount/i), { target: { value: '-10.00' } })
    fireEvent.change(screen.getByLabelText(/reason for this correction/i), { target: { value: 'test' } })
    const form = screen.getByRole('form', { name: /correct cash evidence/i })
    fireEvent.submit(form)
    await screen.findByRole('alert')

    fireEvent.submit(form)
    await screen.findByRole('status')

    const firstKey = (action.mock.calls[0][0] as FormData).get('idempotencyKey')
    const secondKey = (action.mock.calls[1][0] as FormData).get('idempotencyKey')
    expect(secondKey).toBe(firstKey)
  })
})
