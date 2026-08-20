'use client'

import Link from 'next/link'
import { useState } from 'react'

type Offering = { id: string; name: string; description: string | null; durationMinutes: number; priceCents: number; currency: string }

export function ServicePicker({ businessSlug, offerings }: { businessSlug: string; offerings: Offering[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const label = `${selected.length} ${selected.length === 1 ? 'service' : 'services'} selected`
  return <div className="space-y-4">
    <div className="grid gap-4">{offerings.map((offering) => <label key={offering.id} className="flex cursor-pointer gap-4 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm has-[:checked]:border-clay-500 has-[:checked]:bg-clay-50"><input type="checkbox" checked={selected.includes(offering.id)} onChange={() => toggle(offering.id)} aria-label={offering.name} className="mt-1 h-5 w-5 accent-clay-600" /><span className="flex-1"><strong className="font-display text-xl text-cocoa-950">{offering.name}</strong><span className="mt-1 block text-sm text-cocoa-600">{offering.description}</span><span className="mt-3 block text-sm font-semibold text-cocoa-800">{offering.durationMinutes} min · ${(offering.priceCents / 100).toFixed(2)} {offering.currency}</span></span></label>)}</div>
    <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-full border border-sand-200 bg-white/95 p-3 pl-5 shadow-soft backdrop-blur"><span role="status" className="text-sm font-semibold text-cocoa-800">{label}</span>{selected.length > 0 && <Link href={`/book/${businessSlug}?services=${selected.join(',')}`} className="rounded-full bg-cocoa-900 px-5 py-3 text-sm font-semibold text-white">Book selected {selected.length === 1 ? 'service' : 'services'}</Link>}</div>
  </div>
}
