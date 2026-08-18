'use server'

import { redirect } from 'next/navigation'

import { createBookingOrder } from '@/modules/bookings/orders'
import { createPrismaOrderStore } from '@/modules/bookings/repository'
import { returnToCheckoutUrl, signInForCheckoutUrl } from '@/modules/bookings/checkout-session'
import { getActor } from '@/modules/identity/session'

export async function completeBookingAction(input: { businessSlug: string; holdToken: string; paymentChoice: 'FULL' | 'DEPOSIT' | 'CASH'; idempotencyKey: string }) {
  const actor = await getActor()
  if (!actor) redirect(signInForCheckoutUrl(input.businessSlug, input.holdToken))
  const order = await createBookingOrder({ holdToken: input.holdToken, customerId: actor.id, paymentChoice: input.paymentChoice, idempotencyKey: input.idempotencyKey }, { store: createPrismaOrderStore() })
  redirect(`/profile/bookings/${order.id}`)
}

export async function resumeCheckoutAction(businessSlug: string, holdToken: string) {
  redirect(returnToCheckoutUrl(businessSlug, holdToken))
}
