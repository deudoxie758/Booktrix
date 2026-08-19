import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireActor: vi.fn(), loadFinanceLedger: vi.fn(), createFinanceCsv: vi.fn() }))
vi.mock('@/modules/identity/session', () => ({ requireActor: mocks.requireActor, AccessDeniedError: class AccessDeniedError extends Error { code: string; constructor(code: string) { super(code); this.code = code } } }))
vi.mock('@/modules/finance/ledger', () => ({ loadFinanceLedger: mocks.loadFinanceLedger, createFinanceCsv: mocks.createFinanceCsv }))

import { GET } from '@/app/business/finance/export/route'

const model = {
  business: { id: 'business-1', name: 'Island Glow' },
  locations: [],
  filters: { from: null, to: null, locationId: null, status: 'ALL', paymentState: 'ALL', page: 1 },
  summary: { bookedRevenueCents: 0, completedRevenueCents: 0, cancelledRevenueCents: 0, cashDueCents: 0, cashCollectedCents: 0, cashRemainingCents: 0, pendingOnlinePaymentCents: 0, pendingOnlinePaymentRequests: 0 },
  rows: [],
  page: 1, pageSize: 1, totalRows: 0, totalPages: 1,
}

function request(query = '') {
  return new Request(`https://booktrix.test/business/finance/export${query}`)
}

describe('finance CSV export route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireActor.mockResolvedValue({ id: 'accounts-1', email: 'accounts@example.com' })
    mocks.loadFinanceLedger.mockResolvedValue(model)
    mocks.createFinanceCsv.mockReturnValue('Order ID\r\n')
  })

  it('re-authenticates the actor server-side rather than trusting the request', async () => {
    await GET(request())
    expect(mocks.requireActor).toHaveBeenCalled()
    expect(mocks.loadFinanceLedger).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'accounts-1', unpaged: true }), )
  })

  it('never forwards a client-supplied businessId to the ledger loader', async () => {
    await GET(request('?businessId=someone-elses-business&locationId=castries'))
    const input = mocks.loadFinanceLedger.mock.calls[0][0]
    expect(input).not.toHaveProperty('businessId')
    expect(input.rawFilters.locationId).toBe('castries')
  })

  it('returns 401 for an unauthenticated request without querying the ledger', async () => {
    mocks.requireActor.mockRejectedValue(Object.assign(new Error('AUTHENTICATION_REQUIRED'), { code: 'AUTHENTICATION_REQUIRED' }))

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(mocks.loadFinanceLedger).not.toHaveBeenCalled()
  })

  it('returns 403 when the ledger loader denies the actor’s role or business access', async () => {
    mocks.loadFinanceLedger.mockRejectedValue(Object.assign(new Error('FINANCE_ACCESS_DENIED'), { code: 'FINANCE_ACCESS_DENIED' }))

    const response = await GET(request())

    expect(response.status).toBe(403)
  })

  it('returns 400 for an invalid or unauthorized filter', async () => {
    mocks.loadFinanceLedger.mockRejectedValue(Object.assign(new Error('FINANCE_LOCATION_DENIED'), { code: 'FINANCE_LOCATION_DENIED' }))

    const response = await GET(request('?locationId=foreign-location'))

    expect(response.status).toBe(400)
  })

  it('streams a CSV attachment with a safe filename and no-store caching', async () => {
    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="finance-ledger-\d{4}-\d{2}-\d{2}\.csv"$/)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.text()).toBe('Order ID\r\n')
  })
})
