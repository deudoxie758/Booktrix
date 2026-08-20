type Offering = { id: string; name: string; durationMinutes: number; priceCents: number; currency: string }

export function BookingSummary({ offerings }: { offerings: Offering[] }) {
  const total = offerings.reduce((sum, offering) => sum + offering.priceCents, 0)
  return <aside aria-label="Booking summary" className="rounded-3xl border border-sand-200 bg-white p-5 shadow-soft"><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Your booking</p><ul className="mt-4 space-y-3">{offerings.map((offering) => <li key={offering.id} className="flex justify-between gap-3 text-sm"><span><strong className="block text-cocoa-950">{offering.name}</strong><span className="text-cocoa-500">{offering.durationMinutes} min</span></span><strong className="text-cocoa-800">${(offering.priceCents / 100).toFixed(2)} {offering.currency}</strong></li>)}</ul><p className="mt-5 flex justify-between border-t border-sand-200 pt-4 font-semibold text-cocoa-950"><span>Total</span><span>${(total / 100).toFixed(2)} XCD</span></p></aside>
}
