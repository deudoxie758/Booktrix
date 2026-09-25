import { Card } from '@/components/ui/Card'

export function PaymentConnectionStatus() {
  return <Card className="p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Payout readiness</p>
        <h2 className="mt-1 font-display text-2xl text-cocoa-950">Bank connection not available yet</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-cocoa-600">Saint Lucia merchant onboarding and local bank settlement must be verified before online payments are activated. Cash reconciliation remains available now.</p>
      </div>
      <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Provider review required</span>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4"><p className="font-semibold text-cocoa-900">How banking will connect</p><p className="mt-1 text-sm text-cocoa-600">The verified payment provider will collect bank details in its own secure onboarding page.</p></div>
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4"><p className="font-semibold text-cocoa-900">What Booktrx stores</p><p className="mt-1 text-sm text-cocoa-600">Provider account references, verification status, payout totals, fees, and reconciliation IDs—never online-banking credentials.</p></div>
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4"><p className="font-semibold text-cocoa-900">Commercial model</p><p className="mt-1 text-sm text-cocoa-600">Subscription and commission billing are prepared as a later activation step and are not charging businesses today.</p></div>
    </div>
  </Card>
}
