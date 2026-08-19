const { validateProductionEnvironment } = require('../lib/environment')

try {
  validateProductionEnvironment({ ...process.env, NODE_ENV: 'production' })
  console.log('Production environment validated')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Production environment is invalid')
  process.exit(1)
}
