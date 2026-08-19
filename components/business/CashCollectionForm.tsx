'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

export type CashCollectionActionResult = { ok: true; cashCollectedCents: number; cashRemainingCents: number } | { ok: false; error: string }
export type CashCollectionAction = (formData: FormData) => Promise<CashCollectionActionResult>

function money(cents: number) {
  return `EC$${(cents / 100).toFixed(2)}`
}

export function CashCollectionForm({ orderId, cashRemainingCents, action }: { orderId: string; cashRemainingCents: number; action: CashCollectionAction }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<CashCollectionActionResult | null>(null)
  const submitting = useRef(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const formData = new FormData(event.currentTarget)
    const amountValue = Number(formData.get('amount'))
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setResult({ ok: false, error: 'Enter an amount greater than zero.' })
      return
    }
    submitting.current = true
    setPending(true)
    setResult(null)
    formData.set('amountCents', String(Math.round(amountValue * 100)))
    formData.set('orderId', orderId)
    formData.set('idempotencyKey', crypto.randomUUID())
    try {
      const next = await action(formData)
      setResult(next)
    } catch {
      setResult({ ok: false, error: 'Unable to record cash collected. Please try again.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return <form aria-label={`Record cash collected for order ${orderId}`} onSubmit={submit} className="space-y-3">
    <Field required id={`cash-amount-${orderId}`} name="amount" label="Amount collected (XCD)" type="number" min="0.01" max={(cashRemainingCents / 100).toFixed(2)} step="0.01" help={`Remaining due: ${money(cashRemainingCents)}.`} />
    <Button type="submit" disabled={pending}>{pending ? 'Recording…' : 'Record cash collected'}</Button>
    {result ? result.ok === true
      ? <p role="status" className="text-sm font-semibold text-success">Recorded. Remaining due: {money(result.cashRemainingCents)}.</p>
      : <p role="alert" className="text-sm font-semibold text-danger">{result.error}</p>
      : null}
  </form>
}
