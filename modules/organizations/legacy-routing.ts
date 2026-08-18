export function legacyManagerDestination(hasActiveMembership: boolean) {
	return hasActiveMembership ? '/business' : '/for-business'
}
