const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'password123'
  const name = process.env.ADMIN_NAME || 'Admin User'

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
