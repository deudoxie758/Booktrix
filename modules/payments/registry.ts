import type { PaymentProvider } from './provider'
import { unsupportedPaymentProvider } from './providers/unsupported'

const providers = new Map<string, PaymentProvider>()

export function registerPaymentProvider(name: string, provider: PaymentProvider) {
	providers.set(name, provider)
}

export function getPaymentProvider(name: string): PaymentProvider {
	return providers.get(name) ?? unsupportedPaymentProvider
}
