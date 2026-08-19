'use server'

import { revalidatePath } from 'next/cache'
import { recordCashCollection } from '@/modules/finance/cash-collection'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import type { CashCollectionActionResult } from '@/components/business/CashCollectionForm'

const messages: Record<string, string> = {
  FINANCE_ACCESS_DENIED: 'You are not authorized to record cash collections.',
  FINANCE_LOCATION_DENIED: 'Choose only bookings at locations you are authorized to manage.',
  FINANCE_ORDER_NOT_FOUND: 'This booking could not be found.',
  FINANCE_CASH_INVALID_AMOUNT: 'Enter an amount greater than zero.',
  FINANCE_CASH_OVER_COLLECTED: 'This would collect more cash than remains due for this booking.',
  FINANCE_CASH_IDEMPOTENCY_KEY_REQUIRED: 'Unable to record cash collected. Please try again.',
  FINANCE_CASH_IDEMPOTENCY_KEY_REUSED: 'This submission conflicts with an earlier request. Please refresh and try again.',
  FINANCE_CASH_ADJUSTMENT_TARGET_INVALID: 'The referenced cash collection could not be found.',
  FINANCE_CASH_ADJUSTMENT_REASON_REQUIRED: 'Enter a reason for this correction.',
  FINANCE_CASH_ADJUSTMENT_NEGATIVE_TOTAL: 'This correction would drive the recorded cash total negative.',
}

function refreshFinanceConsumers() {
  for (const path of ['/business', '/business/finance']) revalidatePath(path)
}

export async function recordCashCollectionAction(formData: FormData): Promise<CashCollectionActionResult> {
  const context = await requireWorkspaceRole(['OWNER', 'ACCOUNTS'])
  try {
    const amountCents = Number(formData.get('amountCents'))
    const adjustmentOfIdRaw = formData.get('adjustmentOfId')
    const result = await recordCashCollection({
      actorId: context.actor.id,
      businessId: context.business.id,
      orderId: String(formData.get('orderId') ?? ''),
      amountCents,
      idempotencyKey: String(formData.get('idempotencyKey') ?? ''),
      adjustmentOfId: adjustmentOfIdRaw ? String(adjustmentOfIdRaw) : undefined,
      note: formData.get('note') ? String(formData.get('note')) : undefined,
    })
    refreshFinanceConsumers()
    return { ok: true, cashCollectedCents: result.cashCollectedCents, cashRemainingCents: result.cashRemainingCents }
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : ''
    return { ok: false, error: messages[code] ?? 'Unable to record cash collected. Please try again.' }
  }
}
