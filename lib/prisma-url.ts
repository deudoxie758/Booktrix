export function managedDatabaseUrl(value: string | undefined) {
	if (!value) return undefined
  const url = new URL(value)
  url.searchParams.set('connection_limit', '2')
  url.searchParams.set('pool_timeout', '20')
  return url.toString()
}
