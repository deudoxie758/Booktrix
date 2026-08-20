import type { CatalogDepositKind, CatalogPaymentChoice, PaymentAmounts } from './types'

const paymentChoiceOrder: CatalogPaymentChoice[] = ['FULL', 'DEPOSIT', 'CASH']

export function getAllowedPaymentChoices(
  offerings: Array<{ paymentChoices: CatalogPaymentChoice[] }>,
): CatalogPaymentChoice[] {
  if (offerings.length === 0) return []
  return paymentChoiceOrder.filter((choice) =>
    offerings.every((offering) => offering.paymentChoices.includes(choice)),
  )
}

export function calculatePaymentAmounts(input: {
  subtotalCents: number
  choice: CatalogPaymentChoice
  depositKind?: CatalogDepositKind | null
  depositValue?: number | null
}): PaymentAmounts {
  if (!Number.isInteger(input.subtotalCents) || input.subtotalCents < 0) throw new Error('INVALID_SUBTOTAL')
  if (input.choice === 'CASH') return { dueOnlineCents: 0, dueAtAppointmentCents: input.subtotalCents }
  if (input.choice === 'FULL') return { dueOnlineCents: input.subtotalCents, dueAtAppointmentCents: 0 }
  if (!input.depositKind || input.depositValue == null || input.depositValue < 0) {
    throw new Error('INVALID_DEPOSIT')
  }

  const dueOnlineCents = input.depositKind === 'FIXED'
    ? input.depositValue
    : Math.round(input.subtotalCents * (input.depositValue / 100))
  if (input.depositKind === 'PERCENTAGE' && input.depositValue > 100) throw new Error('INVALID_DEPOSIT')
  if (!Number.isInteger(dueOnlineCents) || dueOnlineCents > input.subtotalCents) throw new Error('INVALID_DEPOSIT')

  return { dueOnlineCents, dueAtAppointmentCents: input.subtotalCents - dueOnlineCents }
}

export function calculateBookingPaymentAmounts(input: {
  choice: CatalogPaymentChoice
  segments: Array<{
    priceCents: number
    depositKind?: CatalogDepositKind | null
    depositValue?: number | null
  }>
}): PaymentAmounts {
  return input.segments.reduce<PaymentAmounts>((total, segment) => {
    const amounts = calculatePaymentAmounts({
      subtotalCents: segment.priceCents,
      choice: input.choice,
      depositKind: segment.depositKind,
      depositValue: segment.depositValue,
    })
    return {
      dueOnlineCents: total.dueOnlineCents + amounts.dueOnlineCents,
      dueAtAppointmentCents: total.dueAtAppointmentCents + amounts.dueAtAppointmentCents,
    }
  }, { dueOnlineCents: 0, dueAtAppointmentCents: 0 })
}
