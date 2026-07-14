import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    const res: any = await prisma.$queryRaw`SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME='User' AND COLUMN_NAME='role' AND TABLE_SCHEMA=DATABASE();`
    console.log(JSON.stringify(res, null, 2))
  } catch (e) {
    console.error('Error querying enum:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
