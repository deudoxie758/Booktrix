'use client'

import { useState } from 'react'

import { cancelBookingAction } from './actions'

export function CustomerBookingActions({ orderId, canCancel, rescheduleHref }: { orderId: string; canCancel: boolean; rescheduleHref: string }) {
  const [message, setMessage] = useState('')

  return <div className="mt-6 border-t border-sand-200 pt-5">
    <div className="flex flex-wrap gap-3">
      <a href={rescheduleHref} className="rounded-full border border-cocoa-300 px-5 py-2.5 text-sm font-semibold text-cocoa-900 hover:bg-cream-100">Choose a new time</a>
      {canCancel && <form action={async (formData) => {
        const result = await cancelBookingAction(formData)
        setMessage(result.ok ? 'Your booking was cancelled.' : ('error' in result ? result.error : 'Unable to cancel this booking.'))
      }}>
        <input type="hidden" name="orderId" value={orderId} />
        <button className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50" type="submit">Cancel booking</button>
      </form>}
    </div>
    {message && <p className="mt-3 text-sm text-cocoa-700" role="status">{message}</p>}
  </div>
}
