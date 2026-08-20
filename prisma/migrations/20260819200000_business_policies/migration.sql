-- AlterTable: add public storefront identity fields to Business. Nullable,
-- no default rewrite of any existing row's meaning.
ALTER TABLE `Business` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `BusinessPolicy` (
    `businessId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XCD',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/St_Lucia',
    `defaultConfirmationMode` ENUM('AUTOMATIC', 'MANUAL') NOT NULL DEFAULT 'AUTOMATIC',
    `minimumNoticeMinutes` INTEGER NOT NULL DEFAULT 60,
    `maximumAdvanceBookingDays` INTEGER NOT NULL DEFAULT 90,
    `defaultPreparationMinutes` INTEGER NOT NULL DEFAULT 0,
    `defaultCleanupMinutes` INTEGER NOT NULL DEFAULT 0,
    `cancellationNoticeHours` INTEGER NOT NULL DEFAULT 24,
    `reschedulingNoticeHours` INTEGER NOT NULL DEFAULT 24,
    `cancellationPolicyText` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`businessId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Restrictive one-to-one relation: a business cannot be removed while its
-- policy record still exists, and the policy record is retained alongside
-- storefront history.
ALTER TABLE `BusinessPolicy` ADD CONSTRAINT `BusinessPolicy_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Forward-only backfill: create one safe-default policy row per existing
-- business that doesn't already have one. Idempotent (re-running finds no
-- matching businesses the second time). Does not touch ServiceOffering
-- confirmation mode, buffers, cancellation lead time, or any BookingOrder /
-- BookingSegment row.
INSERT INTO `BusinessPolicy` (`businessId`, `currency`, `timezone`, `defaultConfirmationMode`, `minimumNoticeMinutes`, `maximumAdvanceBookingDays`, `defaultPreparationMinutes`, `defaultCleanupMinutes`, `cancellationNoticeHours`, `reschedulingNoticeHours`, `updatedAt`)
SELECT `id`, 'XCD', 'America/St_Lucia', 'AUTOMATIC', 60, 90, 0, 0, 24, 24, CURRENT_TIMESTAMP(3)
FROM `Business` b
WHERE NOT EXISTS (SELECT 1 FROM `BusinessPolicy` p WHERE p.`businessId` = b.`id`);
