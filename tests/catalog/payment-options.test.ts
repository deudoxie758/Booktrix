import { describe, expect, it } from 'vitest'

import { calculateBookingPaymentAmounts, calculatePaymentAmounts, getAllowedPaymentChoices } from '@/modules/catalog/payment-options'

describe('catalog payment options', () => {
  it('calculates a percentage deposit in integer cents', () => {
    expect(
      calculatePaymentAmounts({
        subtotalCents: 12500,
        choice: 'DEPOSIT',
        depositKind: 'PERCENTAGE',
        depositValue: 30,
      }),
    ).toEqual({ dueOnlineCents: 3750, dueAtAppointmentCents: 8750 })
  })

  it('intersects payment choices across a multi-service order', () => {
    expect(
      getAllowedPaymentChoices([
        { paymentChoices: ['FULL', 'CASH'] },
        { paymentChoices: ['CASH'] },
      ]),
    ).toEqual(['CASH'])
  })

  it('calculates mixed fixed and percentage deposits per segment', () => {
    expect(calculateBookingPaymentAmounts({
      choice: 'DEPOSIT',
      segments: [
        { priceCents: 10000, depositKind: 'FIXED', depositValue: 2500 },
        { priceCents: 7500, depositKind: 'PERCENTAGE', depositValue: 30 },
      ],
    })).toEqual({ dueOnlineCents: 4750, dueAtAppointmentCents: 12750 })
  })
})
