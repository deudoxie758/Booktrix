const safePart = /^[a-z0-9][a-z0-9-]*$/

export function returnToCheckoutUrl(businessSlug: string, holdToken: string) {
  if (!safePart.test(businessSlug) || !holdToken.trim()) throw new Error('INVALID_CHECKOUT_PATH')
  return `/book/${businessSlug}?hold=${encodeURIComponent(holdToken)}`
}

export function signInForCheckoutUrl(businessSlug: string, holdToken: string) {
  return `/auth/sign-in?callbackUrl=${encodeURIComponent(returnToCheckoutUrl(businessSlug, holdToken))}`
}
