import { describe, expect, it } from 'vitest'

import { returnToCheckoutUrl, signInForCheckoutUrl } from '@/modules/bookings/checkout-session'

describe('booking checkout session', () => {
  it('returns authentication to the held business checkout', () => {
    expect(returnToCheckoutUrl('calm-studio', 'hold-token')).toBe('/book/calm-studio?hold=hold-token')
    expect(signInForCheckoutUrl('calm-studio', 'hold-token')).toBe('/auth/sign-in?callbackUrl=%2Fbook%2Fcalm-studio%3Fhold%3Dhold-token')
  })

  it('rejects unsafe path values', () => {
    expect(() => returnToCheckoutUrl('../admin', 'hold-token')).toThrow('INVALID_CHECKOUT_PATH')
  })
})
