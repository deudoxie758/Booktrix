function readAdminBootstrapConfig(environment) {
  const email = environment.ADMIN_EMAIL?.trim().toLowerCase()
  const password = environment.ADMIN_PASSWORD
  const name = environment.ADMIN_NAME?.trim() || 'Platform Admin'
  if (!email) throw new Error('ADMIN_EMAIL is required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid email address')
  if (!password) throw new Error('ADMIN_PASSWORD is required')
  if (password.length < 16) throw new Error('ADMIN_PASSWORD must be at least 16 characters')
  if (/password|123456|qwerty/i.test(password)) throw new Error('ADMIN_PASSWORD is too weak; use a generated unique secret')
  return { email, password, name }
}

module.exports = { readAdminBootstrapConfig }
