type PaymentEnvironment = Record<string, string | undefined>

export function onlinePaymentsEnabled(environment: PaymentEnvironment = process.env) {
  void environment
  return false
}

export function paymentChoiceEnabled(choice: string, environment: PaymentEnvironment = process.env) {
  return choice === 'CASH' || onlinePaymentsEnabled(environment)
}

export function checkoutPaymentChoices<T extends string>(configuredChoices: readonly T[], environment: PaymentEnvironment = process.env): T[] {
  return configuredChoices.filter((choice) => paymentChoiceEnabled(choice, environment))
}

export function offeringCheckoutEnabled(offering: { allowCash: boolean }, environment: PaymentEnvironment = process.env) {
  return offering.allowCash || onlinePaymentsEnabled(environment)
}
