import { describe, expect, it } from 'vitest'

import { checkoutPaymentChoices, offeringCheckoutEnabled, paymentChoiceEnabled } from '@/lib/payment-mode'

describe('staging payment mode', () => {
  const configured = ['FULL', 'DEPOSIT', 'CASH'] as const

  it('offers cash only while online payments are disabled', () => {
    expect(checkoutPaymentChoices(configured, {})).toEqual(['CASH'])
    expect(checkoutPaymentChoices(['FULL'], {})).toEqual([])
    expect(offeringCheckoutEnabled({ allowCash: false }, {})).toBe(false)
    expect(offeringCheckoutEnabled({ allowCash: true }, {})).toBe(true)
  })

  it('does not trust environment flags without an available provider implementation', () => {
    expect(checkoutPaymentChoices(configured, { ONLINE_PAYMENTS_ENABLED: 'true', PAYMENT_PROVIDER: 'wipay' })).toEqual(['CASH'])
  })

  it('fails closed when the enabled flag has no provider', () => {
    expect(checkoutPaymentChoices(configured, { ONLINE_PAYMENTS_ENABLED: 'true' })).toEqual(['CASH'])
  })

  it('rejects direct online checkout attempts while staging is cash-only', () => {
    expect(paymentChoiceEnabled('CASH', {})).toBe(true)
    expect(paymentChoiceEnabled('FULL', {})).toBe(false)
    expect(paymentChoiceEnabled('DEPOSIT', {})).toBe(false)
  })
})
