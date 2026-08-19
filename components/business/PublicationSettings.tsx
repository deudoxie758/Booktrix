'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { IntegrationStagingStatus } from '@/modules/settings/business-policy'
import type { PublicationBlocker } from '@/modules/settings/publication-readiness'

export type PublicationActionResult =
  | { ok: true; status: 'PUBLISHED' | 'SETUP'; blockers: PublicationBlocker[] }
  | { ok: false; error: string; blockers?: PublicationBlocker[] }
export type PublicationAction = (formData: FormData) => Promise<PublicationActionResult>

export type PublicationReadinessView = { status: string; ready: boolean; blockers: PublicationBlocker[] }

function BlockerLink({ blocker }: { blocker: PublicationBlocker }) {
  if (blocker.href.startsWith('#')) return <a href={blocker.href} className="font-semibold text-clay-700 underline underline-offset-2">{blocker.message}</a>
  return <Link href={blocker.href} className="font-semibold text-clay-700 underline underline-offset-2">{blocker.message}</Link>
}

export function PublicationSettings({ readiness, integrationStatus, action }: { readiness: PublicationReadinessView; integrationStatus: IntegrationStagingStatus; action: PublicationAction }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<PublicationActionResult | null>(null)
  const submitting = useRef(false)
  const isPublished = (result?.ok ? result.status : readiness.status) === 'PUBLISHED'
  const blockers = result?.blockers ?? readiness.blockers

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
      setResult({ ok: false, error: 'Unable to reach the server. Please try again.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <section id="publication" aria-labelledby="publication-heading" className="space-y-6 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Marketplace</p>
        <h2 id="publication-heading" className="mt-1 font-display text-2xl text-cocoa-950">Publication</h2>
        <p className="mt-2 text-sm text-cocoa-600">Publishing makes your storefront visible to customers in Booktrix search. Unpublishing hides it again without deleting any locations, services, team assignments, or booking history.</p>
      </div>

      <p className="inline-flex items-center gap-2 rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-cocoa-800">
        Current status: {isPublished ? 'Published to marketplace' : 'Not published'}
      </p>

      {blockers.length ? (
        <div role="status" className="rounded-2xl border border-clay-200 bg-clay-50 p-5">
          <h3 className="font-display text-lg text-cocoa-950">Before you can publish</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-cocoa-700">
            {blockers.map((blocker) => <li key={blocker.code}><BlockerLink blocker={blocker} /></li>)}
          </ul>
        </div>
      ) : (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">Every readiness requirement is met.</p>
      )}

      <form onSubmit={submit} aria-label="Publication status" className="space-y-3">
        <input type="hidden" name="publish" value={isPublished ? 'false' : 'true'} />
        <Button type="submit" disabled={pending || (!isPublished && blockers.length > 0)}>
          {pending ? 'Saving…' : isPublished ? 'Unpublish from marketplace' : 'Publish to marketplace'}
        </Button>
        {result && result.ok === false ? <p role="alert" tabIndex={-1} className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{result.error}</p> : null}
        {result && result.ok === true ? <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">{result.status === 'PUBLISHED' ? 'Published to the marketplace.' : 'Unpublished from the marketplace.'}</p> : null}
      </form>

      <div className="space-y-3 border-t border-sand-200 pt-5">
        <h3 className="font-display text-lg text-cocoa-950">Payments and subscription</h3>
        <p className="text-sm text-cocoa-600">These are staging statuses, not editable controls — no online payment settlement, subscription billing, or commission charges happen in this environment yet.</p>
        <dl className="space-y-3 text-sm">
          <div className="rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3">
            <dt className="font-semibold text-cocoa-900">Online payment provider</dt>
            <dd className="mt-1 text-cocoa-700">{integrationStatus.paymentProvider.message}</dd>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3">
            <dt className="font-semibold text-cocoa-900">Platform subscription billing</dt>
            <dd className="mt-1 text-cocoa-700">{integrationStatus.subscriptionBilling.message}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
