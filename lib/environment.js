function requireValue(environment, name) {
  if (!environment[name]?.trim()) throw new Error(`${name} is required in production`)
}

function validateProductionEnvironment(environment) {
  if (environment.NODE_ENV !== 'production') return

  requireValue(environment, 'DATABASE_URL')
  requireValue(environment, 'NEXTAUTH_URL')
  requireValue(environment, 'NEXTAUTH_SECRET')

  let databaseUrl
  try {
    databaseUrl = new URL(environment.DATABASE_URL)
  } catch {
    throw new Error('DATABASE_URL must be a valid MySQL URL in production')
  }
  if (databaseUrl.protocol !== 'mysql:' || !databaseUrl.hostname || !databaseUrl.username || databaseUrl.pathname === '/' || !databaseUrl.pathname) {
    throw new Error('DATABASE_URL must use mysql:// and include credentials, host, and database in production')
  }
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1)).toUpperCase()
  if (databaseUrl.username.toUpperCase() === 'USER' && databaseUrl.password.toUpperCase() === 'PASSWORD' && databaseUrl.hostname.toUpperCase() === 'HOST' && databaseName === 'DATABASE') {
    throw new Error('DATABASE_URL must not contain sample placeholder values in production')
  }

  let authUrl
  try {
    authUrl = new URL(environment.NEXTAUTH_URL)
  } catch {
    throw new Error('NEXTAUTH_URL must be a valid HTTPS URL in production')
  }
  if (authUrl.protocol !== 'https:') throw new Error('NEXTAUTH_URL must use HTTPS in production')
  if (authUrl.username || authUrl.password || authUrl.search || authUrl.hash || authUrl.pathname !== '/') {
    throw new Error('NEXTAUTH_URL must be a canonical HTTPS origin in production')
  }
  if (environment.NEXTAUTH_SECRET.length < 32) throw new Error('NEXTAUTH_SECRET must be at least 32 characters in production')
  if (environment.NEXTAUTH_SECRET === 'replace-with-at-least-32-random-characters' || new Set(environment.NEXTAUTH_SECRET).size < 12) {
    throw new Error('NEXTAUTH_SECRET must be a unique high-entropy secret in production')
  }
}

module.exports = { validateProductionEnvironment }
