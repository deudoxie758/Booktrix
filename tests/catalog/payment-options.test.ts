import { describe, expect, it } from 'vitest'

import { calculatePaymentAmounts, getAllowedPaymentChoices } from '@/modules/catalog/payment-options'

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
})
