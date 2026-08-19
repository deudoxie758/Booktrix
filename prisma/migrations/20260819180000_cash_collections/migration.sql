-- CreateTable
CREATE TABLE `CashCollection` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `collectorId` VARCHAR(191) NOT NULL,
    `kind` ENUM('COLLECTION', 'ADJUSTMENT') NOT NULL DEFAULT 'COLLECTION',
    `amountCents` INTEGER NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `adjustmentOfId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CashCollection_businessId_idempotencyKey_key`(`businessId`, `idempotencyKey`),
    INDEX `CashCollection_orderId_createdAt_idx`(`orderId`, `createdAt`),
    INDEX `CashCollection_locationId_createdAt_idx`(`locationId`, `createdAt`),
    INDEX `CashCollection_businessId_createdAt_idx`(`businessId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Restrictive foreign keys preserve append-only audit evidence: the tenant,
-- order, location, collector, and any adjustment target it references can
-- never be removed out from under a recorded cash collection.
ALTER TABLE `CashCollection` ADD CONSTRAINT `CashCollection_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CashCollection` ADD CONSTRAINT `CashCollection_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `BookingOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CashCollection` ADD CONSTRAINT `CashCollection_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CashCollection` ADD CONSTRAINT `CashCollection_collectorId_fkey` FOREIGN KEY (`collectorId`) REFERENCES `BusinessMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CashCollection` ADD CONSTRAINT `CashCollection_adjustmentOfId_fkey` FOREIGN KEY (`adjustmentOfId`) REFERENCES `CashCollection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense-in-depth positivity check. Enforced by MySQL 8.0.16+ (the Clever
-- Cloud managed target); silently ignored by older engines, where the
-- application-layer validation in modules/finance/cash-collection.ts remains
-- the authoritative guard. Every CashCollection row records a positive
-- amount; a downward correction is expressed as a separate ADJUSTMENT row
-- referencing the original via adjustmentOfId rather than a negative amount.
ALTER TABLE `CashCollection` ADD CONSTRAINT `CashCollection_amountCents_positive` CHECK (`amountCents` > 0);
