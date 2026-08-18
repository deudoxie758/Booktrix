export type SupportedCurrency = 'XCD'

export type PaymentRequest = {
	amountCents: number
	currency: SupportedCurrency
	reference: string
	returnUrl: string
}

export type PaymentResult = { providerPaymentId: string; checkoutUrl: string }
export type VerifiedPaymentEvent = {
	eventId: string
	providerPaymentId: string
	reference: string
	type: 'PAID' | 'FAILED' | 'REFUNDED' | 'CHARGEBACK'
	amountCents: number
	currency: SupportedCurrency
}

export class PaymentError extends Error {
	constructor(public readonly code: 'INVALID_PAYMENT_REQUEST' | 'PAYMENT_PROVIDER_NOT_CONFIGURED') {
		super(code)
		this.name = 'PaymentError'
	}
}

export function assertPaymentRequest(input: PaymentRequest) {
	if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.currency !== 'XCD' || !input.reference.trim()) {
		throw new PaymentError('INVALID_PAYMENT_REQUEST')
	}
	try { new URL(input.returnUrl) } catch { throw new PaymentError('INVALID_PAYMENT_REQUEST') }
}
