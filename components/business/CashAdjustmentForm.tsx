'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import type { CashCollectionAction, CashCollectionActionResult } from './CashCollectionForm'

function money(cents: number) {
  const sign = cents < 0 ? '-' : ''
  return `${sign}EC$${(Math.abs(cents) / 100).toFixed(2)}`
}

/**
 * Records an append-only ADJUSTMENT against an existing cash-collection entry.
 * Unlike CashCollectionForm, the amount is a signed correction delta: negative
 * to correct an over-recorded collection, positive to correct an
 * under-recorded one. A reason is required for the audit trail. Corrections
 * never edit or delete the original evidence — this creates a new row
 * referencing it via adjustmentOfId.
 */
export function CashAdjustmentForm({ orderId, collectionId, action }: { orderId: string; collectionId: string; action: CashCollectionAction }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<CashCollectionActionResult | null>(null)
  // Same lifecycle discipline as CashCollectionForm: generated once per logical
  // attempt, rotated only after a definitive terminal response, reused as-is
  // when the response is lost so a retry is recognized server-side as a replay.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const submitting = useRef(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const formData = new FormData(event.currentTarget)
    const amountValue = Number(formData.get('amount'))
    const reason = String(formData.get('reason') ?? '').trim()
    if (!Number.isFinite(amountValue) || amountValue === 0) {
      setResult({ ok: false, error: 'Enter a non-zero correction amount.' })
      return
    }
    if (!reason) {
      setResult({ ok: false, error: 'Enter a reason for this correction.' })
      return
    }
    submitting.current = true
    setPending(true)
    setResult(null)
    formData.set('amountCents', String(Math.round(amountValue * 100)))
    formData.set('orderId', orderId)
    formData.set('adjustmentOfId', collectionId)
    formData.set('note', reason)
    formData.set('idempotencyKey', idempotencyKey)
    try {
      const next = await action(formData)
      setResult(next)
      setIdempotencyKey(crypto.randomUUID())
    } catch {
      setResult({ ok: false, error: 'Unable to reach the server. Please try again.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return <form aria-label={`Correct cash evidence for order ${orderId}`} onSubmit={submit} className="space-y-3">
    <Field required id={`cash-adjust-amount-${collectionId}`} name="amount" label="Correction amount (+/- XCD)" type="number" step="0.01" help="Negative reduces recorded cash (over-recorded); positive adds missed cash (under-recorded)." />
    <Field required id={`cash-adjust-reason-${collectionId}`} name="reason" label="Reason for this correction" />
    <Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Recording correction…' : 'Record correction'}</Button>
    {result ? result.ok === true
      ? <p role="status" className="text-sm font-semibold text-success">Correction recorded. Remaining due: {money(result.cashRemainingCents)}.</p>
      : <p role="alert" className="text-sm font-semibold text-danger">{result.error}</p>
      : null}
  </form>
}
