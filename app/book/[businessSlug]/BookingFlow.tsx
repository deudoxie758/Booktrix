'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import { AvailabilityPicker } from '@/components/booking/AvailabilityPicker'
import { BookingStepper } from '@/components/booking/BookingStepper'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { PaymentChoice } from '@/components/booking/PaymentChoice'
import { rescheduleBookingAction } from '@/app/profile/bookings/actions'
import { signInForCheckoutUrl } from '@/modules/bookings/checkout-session'

type CheckoutState = {
  businessId?: string
  businessSlug: string
  businessName: string
  locations: Array<{ id: string; name: string }>
  offerings: Array<{ id: string; name: string; durationMinutes: number; priceCents: number; currency: string; paymentChoices: readonly string[] }>
  professionals?: Array<{ id: string; name: string | null }>
  selectedOfferingIds: string[]
  hold: null | { token: string; expiresAt: string; expired: boolean; segments?: HeldAppointmentSegment[] }
  authenticated: boolean
  rescheduleOrderId?: string
}

type HeldAppointmentSegment = {
  offeringId: string
  offeringName: string
  startsAt: string
  endsAt: string
  locationName: string
  professionalName?: string | null
}

export function BookingFlow({ initialState }: { initialState: CheckoutState }) {
  const [hydrated, setHydrated] = useState(false)
  const [step, setStep] = useState(initialState.hold && !initialState.hold.expired ? (initialState.authenticated ? 4 : 3) : 0)
  const [locationId, setLocationId] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Array<{ start: string; segments: Array<Record<string, unknown>> }>>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [reserving, setReserving] = useState(false)
  const [hold, setHold] = useState(initialState.hold)
  const [payment, setPayment] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string>()
  const [error, setError] = useState('')
  const [holdError, setHoldError] = useState('')
  const alertRef = useRef<HTMLDivElement>(null)
  const holdAlertRef = useRef<HTMLDivElement>(null)
  const checkoutAlertRef = useRef<HTMLParagraphElement>(null)
  const bookingCompleteRef = useRef<HTMLParagraphElement>(null)
  const reservationInFlightRef = useRef(false)
  const confirmationIdempotencyKeyRef = useRef<string | null>(null)
  const offerings = initialState.offerings.filter((offering) => initialState.selectedOfferingIds.includes(offering.id))
  const paymentChoices = offerings.reduce<string[]>((choices, offering, index) => index === 0 ? [...offering.paymentChoices] : choices.filter((choice) => offering.paymentChoices.includes(choice)), [])
  useEffect(() => { setHydrated(true) }, [])
  useEffect(() => { if (initialState.hold?.expired) alertRef.current?.focus() }, [initialState.hold?.expired])
  useEffect(() => { if (holdError) holdAlertRef.current?.focus() }, [holdError])
  useEffect(() => { if (error) checkoutAlertRef.current?.focus() }, [error])
  useEffect(() => { if (orderId) bookingCompleteRef.current?.focus() }, [orderId])
  const loadDate = async (value: string) => {
    setDate(value)
    setLoadingSlots(true)
    setHoldError('')
    const localDayStart = new Date(`${value}T04:00:00.000Z`)
    const from = localDayStart.toISOString()
    const to = new Date(localDayStart.getTime() + 86_400_000).toISOString()
    try {
      const query = new URLSearchParams({ businessId: initialState.businessId ?? '', locationId, offeringIds: offerings.map((item) => item.id).join(','), attendeeCounts: offerings.map(() => '1').join(','), from, to })
      const response = await fetch(`/api/availability?${query}`)
      const body = await response.json()
      if (!response.ok) throw new Error(typeof body.message === 'string' ? body.message : 'Availability could not be loaded. Please try again.')
      setSlots(body.slots)
    } catch {
      setSlots([])
      setHoldError('Availability could not be loaded. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
  }
  const reserve = async (slot: { start: string; segments: Array<Record<string, unknown>> }) => {
    if (reservationInFlightRef.current) return
    reservationInFlightRef.current = true
    setReserving(true)
    setHold(null)
    setHoldError('')
    try {
      const response = await fetch('/api/booking-holds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: initialState.businessId, locationId, checkoutIdentity: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), segments: slot.segments.map((segment) => ({ offeringId: segment.offeringId, membershipId: segment.membershipId, start: segment.start, attendeeCount: segment.attendeeCount })) }) })
      const body = await response.json()
      if (response.ok) {
        const locationName = initialState.locations.find((location) => location.id === locationId)?.name ?? 'Selected location'
        const segments = slot.segments.map((segment) => {
          const offering = offerings.find((item) => item.id === segment.offeringId)
          const startsAt = String(segment.start)
          const endsAt = segment.end ? String(segment.end) : new Date(new Date(startsAt).getTime() + (offering?.durationMinutes ?? 0) * 60_000).toISOString()
          return {
            offeringId: String(segment.offeringId),
            offeringName: offering?.name ?? 'Selected service',
            startsAt,
            endsAt,
            locationName,
            professionalName: initialState.professionals?.find((professional) => professional.id === segment.membershipId)?.name,
          }
        })
        setHold({ token: body.token, expiresAt: body.expiresAt, expired: false, segments })
      }
      else setHoldError(body.message ?? 'That time could not be reserved. Please choose another.')
    } catch {
      setHoldError('That time could not be reserved. Please choose another.')
    } finally {
      reservationInFlightRef.current = false
      setReserving(false)
    }
  }
  const confirm = async () => {
    if (!hold || (!payment && !initialState.rescheduleOrderId) || submitting) return
    setSubmitting(true)
    setError('')
    try {
      if (initialState.rescheduleOrderId) {
        const formData = new FormData()
        formData.set('orderId', initialState.rescheduleOrderId)
        formData.set('replacementHoldToken', hold.token)
        const result = await rescheduleBookingAction(formData)
        if (result.ok) setOrderId(initialState.rescheduleOrderId)
        else if ('error' in result) setError(result.error)
      } else {
        confirmationIdempotencyKeyRef.current ??= crypto.randomUUID()
        const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdToken: hold.token, paymentChoice: payment, idempotencyKey: confirmationIdempotencyKeyRef.current }) })
        const body = await response.json()
        if (response.ok) setOrderId(body.order.id)
        else setError(body.error ?? body.message ?? 'Unable to complete this booking.')
      }
    } catch {
      setError('Unable to complete this booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  return <div className="space-y-6">
    <BookingStepper current={step} />
    {initialState.hold?.expired && <div ref={alertRef} tabIndex={-1} role="alert" className="rounded-2xl border border-danger/30 bg-red-50 p-4 text-sm font-semibold text-danger">Your reserved time expired. Your services are saved—please choose another time.</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]"><section className="rounded-3xl border border-sand-200 bg-cream-50 p-5 sm:p-7">
      {step === 0 && <><h2 className="font-display text-3xl text-cocoa-950">Selected services</h2><p className="mt-2 text-cocoa-600">Review your choices before selecting where to go.</p><button onClick={() => setStep(1)} className="mt-6 rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white">Continue to location</button></>}
      {step === 1 && <><fieldset><legend className="font-display text-3xl text-cocoa-950">Choose a location</legend><div className="mt-5 grid gap-3">{initialState.locations.map((location) => <label key={location.id} className="flex min-h-14 items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4"><input type="radio" name="location" checked={locationId === location.id} onChange={() => setLocationId(location.id)} /><span>{location.name}</span></label>)}</div></fieldset><button disabled={!locationId} onClick={() => setStep(2)} className="mt-6 rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40">Continue to date</button></>}
      {step === 2 && <><h2 className="mb-5 font-display text-3xl text-cocoa-950">Choose a date and time</h2><AvailabilityPicker slots={slots} loading={loadingSlots} reserving={reserving} onDate={loadDate} onSelect={reserve} />{holdError && <div ref={holdAlertRef} tabIndex={-1} role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{holdError}</div>}{hold && !hold.expired && <p role="status" className="mt-4 rounded-2xl bg-clay-100 p-4 text-sm font-semibold text-cocoa-900">Time reserved for 10 minutes.</p>}<button disabled={reserving || !date || !hold || hold.expired} onClick={() => setStep(initialState.rescheduleOrderId ? 5 : 3)} className="mt-6 rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40">{initialState.rescheduleOrderId ? 'Review new time' : 'Continue to details'}</button></>}
      {step === 3 && <><h2 className="font-display text-3xl text-cocoa-950">Customer details</h2><p className="mt-2 text-cocoa-600">You’ll sign in before confirming so this booking stays connected to your account.</p>{initialState.authenticated ? <button onClick={() => setStep(4)} className="mt-6 rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white">Continue to payment</button> : hold && <Link href={signInForCheckoutUrl(initialState.businessSlug, hold.token)} className="mt-6 inline-flex rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white">Sign in to continue</Link>}</>}
      {step === 4 && <><PaymentChoice choices={paymentChoices} value={payment} disabled={!hydrated} onChange={setPayment} /><button disabled={!hydrated || !payment} onClick={() => setStep(5)} className="mt-6 rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40">Review booking</button></>}
      {step === 5 && <>{orderId ? <><h2 className="font-display text-3xl text-cocoa-950">Booking complete</h2><p ref={bookingCompleteRef} tabIndex={-1} role="status" className="mt-2 text-cocoa-600">Booking complete. You can view your booking details below.</p><AppointmentDetails segments={hold?.segments ?? []} /><Link href={`/profile/bookings/${orderId}`} className="mt-6 inline-flex rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white">View your booking</Link></> : <><h2 className="font-display text-3xl text-cocoa-950">{initialState.rescheduleOrderId ? 'Confirm your new time' : 'Review and confirm'}</h2><p className="mt-2 text-cocoa-600">{initialState.rescheduleOrderId ? 'Your original appointment stays reserved until you confirm this replacement.' : 'Your slot is reserved while checkout completes.'}</p><AppointmentDetails segments={hold?.segments ?? []} />{error && <p ref={checkoutAlertRef} tabIndex={-1} role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}<button disabled={submitting} onClick={confirm} className="mt-6 rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40">{submitting ? 'Confirming…' : initialState.rescheduleOrderId ? 'Confirm new time' : 'Confirm booking'}</button></>}</>}
    </section><div className="lg:sticky lg:top-6 lg:self-start"><BookingSummary offerings={offerings} /></div></div>
  </div>
}

const appointmentDate = new Intl.DateTimeFormat('en-LC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/St_Lucia' })
const appointmentTime = new Intl.DateTimeFormat('en-LC', { hour: 'numeric', minute: '2-digit', timeZone: 'America/St_Lucia' })

function AppointmentDetails({ segments }: { segments: HeldAppointmentSegment[] }) {
  if (!segments.length) return null
  return <section aria-label="Appointment details" className="mt-6 rounded-2xl border border-sand-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Appointment</p><div className="mt-3 space-y-4">{segments.map((segment, index) => <div key={`${segment.offeringId}-${segment.startsAt}-${index}`}><p className="font-semibold text-cocoa-950">{segment.offeringName}</p><p className="mt-1 text-sm text-cocoa-800"><span>{appointmentDate.format(new Date(segment.startsAt))}</span> at <span>{appointmentTime.format(new Date(segment.startsAt))}</span></p><p className="mt-1 text-sm text-cocoa-600">{segment.locationName}{segment.professionalName ? ` · With ${segment.professionalName}` : ''}</p></div>)}</div></section>
}
