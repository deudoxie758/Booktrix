import { prisma } from '../lib/prisma'
import { purgeExpiredSensitiveIntake } from '../modules/intake/retention'

const configuredDays = Number.parseInt(process.env.SENSITIVE_INTAKE_RETENTION_DAYS ?? '365', 10)

purgeExpiredSensitiveIntake({ retentionDays: configuredDays })
  .then(({ purged, cutoff }) => console.log(`Purged encrypted intake responses from ${purged} booking(s) created before ${cutoff.toISOString()}.`))
  .finally(() => prisma.$disconnect())
