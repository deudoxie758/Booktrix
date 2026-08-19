import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireWorkspaceRole: vi.fn(),
  recordCashCollection: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/modules/organizations/context', () => ({ requireWorkspaceRole: mocks.requireWorkspaceRole }))
vi.mock('@/modules/finance/cash-collection', () => ({ recordCashCollection: mocks.recordCashCollection }))

import { recordCashCollectionAction } from '@/app/business/finance/actions'

const context = { actor: { id: 'owner' }, business: { id: 'business-a' }, membership: { role: 'OWNER' } }

function collectionForm() {
  const data = new FormData()
  data.set('orderId', 'order-1')
  data.set('amountCents', '5000')
  data.set('idempotencyKey', 'key-1')
  return data
}

function adjustmentForm() {
  const data = new FormData()
  data.set('orderId', 'order-1')
  data.set('amountCents', '-2000')
  data.set('idempotencyKey', 'key-correction')
  data.set('adjustmentOfId', 'collection-1')
  data.set('note', 'Recorded $50 by mistake; actually $30.')
  return data
}

describe('recordCashCollectionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireWorkspaceRole.mockResolvedValue(context)
    mocks.recordCashCollection.mockResolvedValue({ cashCollectedCents: 3000, cashRemainingCents: 5000 })
  })

  it('requires Owner or Accounts before reaching the finance domain', async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new Error('BUSINESS_ACCESS_DENIED'))
    await expect(recordCashCollectionAction(collectionForm())).rejects.toThrow('BUSINESS_ACCESS_DENIED')
    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(['OWNER', 'ACCOUNTS'])
  })

  it('forwards a plain collection without an adjustmentOfId', async () => {
    await recordCashCollectionAction(collectionForm())
    expect(mocks.recordCashCollection).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 5000, idempotencyKey: 'key-1', adjustmentOfId: undefined }))
  })

  it('forwards adjustmentOfId and note from the form so a correction can be recorded (previously dropped — no UI path could ever create an adjustment)', async () => {
    await recordCashCollectionAction(adjustmentForm())
    expect(mocks.recordCashCollection).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: -2000, idempotencyKey: 'key-correction',
      adjustmentOfId: 'collection-1', note: 'Recorded $50 by mistake; actually $30.',
    }))
  })

  it('revalidates finance consumers on success', async () => {
    await recordCashCollectionAction(collectionForm())
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual(['/business', '/business/finance'])
  })

  it('maps a negative-total adjustment rejection to a semantic message', async () => {
    mocks.recordCashCollection.mockRejectedValue(Object.assign(new Error('FINANCE_CASH_ADJUSTMENT_NEGATIVE_TOTAL'), { code: 'FINANCE_CASH_ADJUSTMENT_NEGATIVE_TOTAL' }))
    const result = await recordCashCollectionAction(adjustmentForm())
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/negative/i) })
  })

  it('maps a missing-reason adjustment rejection to a semantic message', async () => {
    mocks.recordCashCollection.mockRejectedValue(Object.assign(new Error('FINANCE_CASH_ADJUSTMENT_REASON_REQUIRED'), { code: 'FINANCE_CASH_ADJUSTMENT_REASON_REQUIRED' }))
    const result = await recordCashCollectionAction(adjustmentForm())
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/reason/i) })
  })
})
