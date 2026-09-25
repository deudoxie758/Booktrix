'use client'
import { useState } from 'react'
import { WalkInCustomerFields } from './WalkInCustomerFields'

type Option = { id: string; name: string }
type IntakeQuestion = { id: string; label: string; type: string; required: boolean; sensitive: boolean }

export function BookingEditor({ locations, offerings, staff, intakeQuestionsByOffering = {}, action }: { locations: Option[]; offerings: Option[]; staff: Option[]; intakeQuestionsByOffering?: Record<string, IntakeQuestion[]>; action?: (formData: FormData) => void | Promise<void> }) {
  const [kind, setKind] = useState<'REGISTERED' | 'WALK_IN'>('REGISTERED')
  const [offeringId, setOfferingId] = useState('')
  const questions = intakeQuestionsByOffering[offeringId] ?? []
  const hasSensitive = questions.some((question) => question.sensitive)
  return <form action={action} className="space-y-5 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">New appointment</p><h2 className="mt-1 font-display text-2xl text-cocoa-950">Add a booking</h2></div>
    <fieldset><legend className="mb-2 text-sm font-semibold text-cocoa-800">Customer type</legend><div className="flex flex-wrap gap-4"><label><input type="radio" name="customerKind" value="REGISTERED" checked={kind === 'REGISTERED'} onChange={() => setKind('REGISTERED')} /> Registered customer</label><label><input type="radio" name="customerKind" value="WALK_IN" checked={kind === 'WALK_IN'} onChange={() => setKind('WALK_IN')} /> Walk-in customer</label></div></fieldset>
    {kind === 'REGISTERED' ? <label className="block text-sm font-semibold text-cocoa-800">Customer ID<input required name="customerId" className="mt-1 w-full rounded-xl border border-sand-300 px-3 py-2" /></label> : <WalkInCustomerFields />}
    <div className="grid gap-4 sm:grid-cols-2"><Select label="Location" name="locationId" options={locations} /><label className="text-sm font-semibold text-cocoa-800">Service<select required name="offeringId" value={offeringId} onChange={(event) => setOfferingId(event.target.value)} className="mt-1 w-full rounded-xl border border-sand-300 bg-white px-3 py-2"><option value="">Choose service</option>{offerings.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><Select label="Professional" name="membershipId" options={staff} optional /><label className="text-sm font-semibold text-cocoa-800">Date and time<input required name="startsAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-sand-300 px-3 py-2" /></label></div>
    {questions.length > 0 && <fieldset className="space-y-4 rounded-2xl bg-cream-50 p-5"><legend className="px-2 font-display text-xl text-cocoa-950">Customer intake</legend>{questions.map((question) => <label key={question.id} className="block text-sm font-semibold text-cocoa-800">{question.label}{question.required ? ' *' : ''}{question.type === 'LONG_TEXT' ? <textarea required={question.required} name={`intake_${question.id}`} className="mt-2 min-h-24 w-full rounded-xl border border-sand-300 p-3" /> : <input required={question.required} name={`intake_${question.id}`} type={question.type === 'DATE' ? 'date' : 'text'} className="mt-2 min-h-11 w-full rounded-xl border border-sand-300 px-3" />}</label>)}{hasSensitive && <label className="flex gap-3 text-sm text-cocoa-700"><input required type="checkbox" name="sensitiveConsent" /> Customer consent was obtained for sensitive intake responses.</label>}</fieldset>}
    <button type="submit" className="rounded-full bg-cocoa-900 px-5 py-3 text-sm font-semibold text-white">Create booking</button>
  </form>
}

function Select({ label, name, options, optional = false }: { label: string; name: string; options: Option[]; optional?: boolean }) { return <label className="text-sm font-semibold text-cocoa-800">{label}<select required={!optional} name={name} className="mt-1 w-full rounded-xl border border-sand-300 bg-white px-3 py-2"><option value="">{optional ? 'Unassigned' : `Choose ${label.toLowerCase()}`}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label> }
