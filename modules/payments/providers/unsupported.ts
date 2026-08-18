import type { PaymentProvider } from '../provider'
import { assertPaymentRequest, PaymentError } from '../types'

export const unsupportedPaymentProvider: PaymentProvider = {
	async createCheckout(input) { assertPaymentRequest(input); throw new PaymentError('PAYMENT_PROVIDER_NOT_CONFIGURED') },
	async verifyReturn() { throw new PaymentError('PAYMENT_PROVIDER_NOT_CONFIGURED') },
	async verifyWebhook() { throw new PaymentError('PAYMENT_PROVIDER_NOT_CONFIGURED') },
	async refund() { throw new PaymentError('PAYMENT_PROVIDER_NOT_CONFIGURED') },
}
