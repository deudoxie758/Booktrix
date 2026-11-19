import { disconnectPhase2E2ESeeder, seedPhase2E2E } from './seed-phase2-e2e'

seedPhase2E2E()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(disconnectPhase2E2ESeeder)
