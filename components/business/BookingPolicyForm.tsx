'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { BUSINESS_CURRENCY, BUSINESS_TIMEZONE, type PolicyMutationResult } from '@/modules/settings/business-policy'

export type BookingPolicyAction = (formData: FormData) => Promise<PolicyMutationResult>

export type BookingPolicyValues = {
  currency: string
  timezone: string
  defaultConfirmationMode: 'AUTOMATIC' | 'MANUAL'
  minimumNoticeMinutes: number
  maximumAdvanceBookingDays: number
  defaultPreparationMinutes: number
  defaultCleanupMinutes: number
  cancellationNoticeHours: number
  reschedulingNoticeHours: number
  cancellationPolicyText: string | null
}

const numberInput = 'min-h-12 w-full rounded-2xl border border-sand-300 bg-white px-4 text-cocoa-950 outline-none transition focus:border-clay-500 focus:ring-4 focus:ring-clay-100'

export function BookingPolicyForm({ policy, action }: { policy: BookingPolicyValues; action: BookingPolicyAction }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<PolicyMutationResult | null>(null)
  const submitting = useRef(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const formData = new FormData(event.currentTarget)
    submitting.current = true
    setPending(true)
    setResult(null)
    try {
      setResult(await action(formData))
    } catch {
      setResult({ ok: false, error: 'Unable to save your booking policy. Please try again.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  const errors = result?.ok === false ? result.fieldErrors : undefined
  return (
    <section id="policy" aria-labelledby="policy-heading" className="space-y-5 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Booking defaults</p>
        <h2 id="policy-heading" className="mt-1 font-display text-2xl text-cocoa-950">Booking policy</h2>
        <p className="mt-2 text-sm text-cocoa-600">These defaults apply to new services. Saving them never rewrites confirmation mode, buffers, or cancellation lead time on services you’ve already created.</p>
      </div>
      <form onSubmit={submit} aria-label="Booking policy" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-cocoa-900" htmlFor="settings-currency">Currency</label>
            <input id="settings-currency" name="currency" value={BUSINESS_CURRENCY} readOnly aria-readonly="true" className={`${numberInput} bg-sand-50 text-cocoa-600`} />
            <p className="text-sm text-cocoa-600">Booktrix businesses operate in Eastern Caribbean dollars (XCD).</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-cocoa-900" htmlFor="settings-timezone">Timezone</label>
            <input id="settings-timezone" name="timezone" value={BUSINESS_TIMEZONE} readOnly aria-readonly="true" className={`${numberInput} bg-sand-50 text-cocoa-600`} />
            <p className="text-sm text-cocoa-600">Appointment days are calculated using Saint Lucia local time.</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-cocoa-900" htmlFor="settings-confirmation">Default confirmation</label>
            <select id="settings-confirmation" name="defaultConfirmationMode" defaultValue={policy.defaultConfirmationMode} className={numberInput}>
              <option value="AUTOMATIC">Automatic</option>
              <option value="MANUAL">Manual approval</option>
            </select>
          </div>
          <Field id="settings-minimum-notice" name="minimumNoticeMinutes" type="number" min="0" label="Minimum booking notice (minutes)" defaultValue={policy.minimumNoticeMinutes} error={errors?.minimumNoticeMinutes} />
          <Field id="settings-max-advance" name="maximumAdvanceBookingDays" type="number" min="1" label="Maximum advance booking (days)" defaultValue={policy.maximumAdvanceBookingDays} error={errors?.maximumAdvanceBookingDays} />
          <Field id="settings-preparation" name="defaultPreparationMinutes" type="number" min="0" label="Default preparation buffer (minutes)" defaultValue={policy.defaultPreparationMinutes} error={errors?.defaultPreparationMinutes} />
          <Field id="settings-cleanup" name="defaultCleanupMinutes" type="number" min="0" label="Default cleanup buffer (minutes)" defaultValue={policy.defaultCleanupMinutes} error={errors?.defaultCleanupMinutes} />
          <Field id="settings-cancellation-notice" name="cancellationNoticeHours" type="number" min="0" label="Cancellation notice (hours)" defaultValue={policy.cancellationNoticeHours} error={errors?.cancellationNoticeHours} />
          <Field id="settings-reschedule-notice" name="reschedulingNoticeHours" type="number" min="0" label="Rescheduling notice (hours)" defaultValue={policy.reschedulingNoticeHours} error={errors?.reschedulingNoticeHours} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-cocoa-900" htmlFor="settings-cancellation-text">Cancellation and rescheduling policy</label>
          <textarea id="settings-cancellation-text" name="cancellationPolicyText" defaultValue={policy.cancellationPolicyText ?? ''} rows={5} placeholder="Explain how customers can cancel or reschedule, and any fees that apply." aria-invalid={Boolean(errors?.cancellationPolicyText)} aria-describedby={errors?.cancellationPolicyText ? 'settings-cancellation-text-error' : undefined} className={`w-full rounded-2xl border bg-white px-4 py-3 text-cocoa-950 outline-none transition placeholder:text-cocoa-400 focus:border-clay-500 focus:ring-4 focus:ring-clay-100 ${errors?.cancellationPolicyText ? 'border-danger' : 'border-sand-300'}`} />
          {errors?.cancellationPolicyText ? <p id="settings-cancellation-text-error" className="text-sm font-medium text-danger">{errors.cancellationPolicyText}</p> : <p className="text-sm text-cocoa-600">Shown to customers before booking, and required before you can publish to the marketplace.</p>}
        </div>
        {result ? result.ok === true
          ? <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">Booking policy saved.</p>
          : <p role="alert" tabIndex={-1} className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{result.error}</p>
          : null}
        <Button type="submit" disabled={pending}>{pending ? 'Saving policy…' : 'Save booking policy'}</Button>
      </form>
    </section>
  )
}
