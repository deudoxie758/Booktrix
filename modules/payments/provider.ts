import type { PaymentRequest, PaymentResult, VerifiedPaymentEvent } from './types'

export interface PaymentProvider {
	createCheckout(input: PaymentRequest): Promise<PaymentResult>
	verifyReturn(input: URLSearchParams): Promise<VerifiedPaymentEvent>
	verifyWebhook(input: { rawBody: string; headers: Headers }): Promise<VerifiedPaymentEvent[]>
	refund(input: { providerPaymentId: string; amountCents: number }): Promise<VerifiedPaymentEvent>
}
