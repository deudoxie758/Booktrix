const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
require('dotenv').config()
const { readAdminBootstrapConfig } = require('./admin-bootstrap-config')

const prisma = new PrismaClient()

async function main() {
  const { email, password, name } = readAdminBootstrapConfig(process.env)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('User already exists:', existing.email, 'role:', existing.role)
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } })
      console.log('Updated existing user role to ADMIN')
    }
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword: hashed,
      role: 'ADMIN',
    },
  })

  console.log('Created admin user:', user.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
