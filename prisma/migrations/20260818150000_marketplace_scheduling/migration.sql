-- AlterTable
ALTER TABLE `AuditLog` MODIFY `actorRole` ENUM('USER', 'OWNER', 'EMPLOYEE', 'ACCOUNTANT', 'ADMIN') NOT NULL DEFAULT 'OWNER';

-- AlterTable
ALTER TABLE `Booking` MODIFY `createdByRole` ENUM('USER', 'OWNER', 'EMPLOYEE', 'ACCOUNTANT', 'ADMIN') NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('USER', 'OWNER', 'EMPLOYEE', 'ACCOUNTANT', 'ADMIN') NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE `ServiceOffering` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `legacySubserviceId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `preparationMinutes` INTEGER NOT NULL DEFAULT 0,
    `cleanupMinutes` INTEGER NOT NULL DEFAULT 0,
    `priceCents` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XCD',
    `capacity` INTEGER NOT NULL DEFAULT 1,
    `confirmationMode` ENUM('AUTOMATIC', 'MANUAL') NOT NULL DEFAULT 'AUTOMATIC',
    `allowFullPayment` BOOLEAN NOT NULL DEFAULT true,
    `allowDeposit` BOOLEAN NOT NULL DEFAULT false,
    `allowCash` BOOLEAN NOT NULL DEFAULT true,
    `depositKind` ENUM('FIXED', 'PERCENTAGE') NULL,
    `depositValue` INTEGER NULL,
    `cancellationLeadMin` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceOffering_legacySubserviceId_key`(`legacySubserviceId`),
    INDEX `ServiceOffering_businessId_active_category_idx`(`businessId`, `active`, `category`),
    INDEX `ServiceOffering_businessId_name_idx`(`businessId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceLocation` (
    `offeringId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceLocation_locationId_active_idx`(`locationId`, `active`),
    PRIMARY KEY (`offeringId`, `locationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffQualification` (
    `membershipId` VARCHAR(191) NOT NULL,
    `offeringId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StaffQualification_offeringId_locationId_active_idx`(`offeringId`, `locationId`, `active`),
    PRIMARY KEY (`membershipId`, `offeringId`, `locationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationHours` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `startMinute` INTEGER NOT NULL,
    `endMinute` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LocationHours_locationId_weekday_idx`(`locationId`, `weekday`),
    UNIQUE INDEX `LocationHours_locationId_weekday_startMinute_endMinute_key`(`locationId`, `weekday`, `startMinute`, `endMinute`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `membershipId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `startMinute` INTEGER NOT NULL,
    `endMinute` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffSchedule_locationId_weekday_idx`(`locationId`, `weekday`),
    UNIQUE INDEX `StaffSchedule_membershipId_locationId_weekday_startMinute_en_key`(`membershipId`, `locationId`, `weekday`, `startMinute`, `endMinute`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffTimeOff` (
    `id` VARCHAR(191) NOT NULL,
    `membershipId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffTimeOff_membershipId_startsAt_endsAt_idx`(`membershipId`, `startsAt`, `endsAt`),
    INDEX `StaffTimeOff_locationId_startsAt_idx`(`locationId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SchedulingLock` (
    `id` VARCHAR(191) NOT NULL,
    `lockKey` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `bucketAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SchedulingLock_lockKey_key`(`lockKey`),
    INDEX `SchedulingLock_locationId_bucketAt_idx`(`locationId`, `bucketAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingHold` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `checkoutIdentity` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookingHold_token_key`(`token`),
    UNIQUE INDEX `BookingHold_idempotencyKey_key`(`idempotencyKey`),
    INDEX `BookingHold_businessId_expiresAt_consumedAt_idx`(`businessId`, `expiresAt`, `consumedAt`),
    INDEX `BookingHold_customerId_expiresAt_idx`(`customerId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingHoldSegment` (
    `id` VARCHAR(191) NOT NULL,
    `holdId` VARCHAR(191) NOT NULL,
    `offeringId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `membershipId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `occupiedStartsAt` DATETIME(3) NOT NULL,
    `occupiedEndsAt` DATETIME(3) NOT NULL,
    `attendeeCount` INTEGER NOT NULL DEFAULT 1,
    `priceCents` INTEGER NOT NULL,

    INDEX `BookingHoldSegment_membershipId_occupiedStartsAt_occupiedEnd_idx`(`membershipId`, `occupiedStartsAt`, `occupiedEndsAt`),
    INDEX `BookingHoldSegment_offeringId_locationId_startsAt_idx`(`offeringId`, `locationId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingOrder` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `legacyBookingId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `origin` ENUM('CUSTOMER', 'MANAGER', 'WALK_IN', 'LEGACY') NOT NULL DEFAULT 'CUSTOMER',
    `status` ENUM('DRAFT', 'HELD', 'PAYMENT_PENDING', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'PARTIALLY_CANCELLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `customerName` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XCD',
    `subtotalCents` INTEGER NOT NULL,
    `paidCents` INTEGER NOT NULL DEFAULT 0,
    `paymentChoice` ENUM('FULL', 'DEPOSIT', 'CASH') NOT NULL,
    `dueOnlineCents` INTEGER NOT NULL DEFAULT 0,
    `dueAtAppointmentCents` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookingOrder_legacyBookingId_key`(`legacyBookingId`),
    UNIQUE INDEX `BookingOrder_idempotencyKey_key`(`idempotencyKey`),
    INDEX `BookingOrder_businessId_status_createdAt_idx`(`businessId`, `status`, `createdAt`),
    INDEX `BookingOrder_customerId_createdAt_idx`(`customerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingSegment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `offeringId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `membershipId` VARCHAR(191) NULL,
    `legacyBookingId` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `occupiedStartsAt` DATETIME(3) NOT NULL,
    `occupiedEndsAt` DATETIME(3) NOT NULL,
    `attendeeCount` INTEGER NOT NULL DEFAULT 1,
    `priceCents` INTEGER NOT NULL,
    `confirmationMode` ENUM('AUTOMATIC', 'MANUAL') NOT NULL,
    `status` ENUM('REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookingSegment_legacyBookingId_key`(`legacyBookingId`),
    INDEX `BookingSegment_locationId_startsAt_status_idx`(`locationId`, `startsAt`, `status`),
    INDEX `BookingSegment_membershipId_occupiedStartsAt_occupiedEndsAt_idx`(`membershipId`, `occupiedStartsAt`, `occupiedEndsAt`),
    INDEX `BookingSegment_orderId_startsAt_idx`(`orderId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingOverride` (
    `id` VARCHAR(191) NOT NULL,
    `segmentId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `previousValues` JSON NOT NULL,
    `resultingValues` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BookingOverride_segmentId_createdAt_idx`(`segmentId`, `createdAt`),
    INDEX `BookingOverride_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceOffering` ADD CONSTRAINT `ServiceOffering_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceLocation` ADD CONSTRAINT `ServiceLocation_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `ServiceOffering`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceLocation` ADD CONSTRAINT `ServiceLocation_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffQualification` ADD CONSTRAINT `StaffQualification_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffQualification` ADD CONSTRAINT `StaffQualification_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `ServiceOffering`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffQualification` ADD CONSTRAINT `StaffQualification_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationHours` ADD CONSTRAINT `LocationHours_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSchedule` ADD CONSTRAINT `StaffSchedule_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSchedule` ADD CONSTRAINT `StaffSchedule_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffTimeOff` ADD CONSTRAINT `StaffTimeOff_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffTimeOff` ADD CONSTRAINT `StaffTimeOff_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchedulingLock` ADD CONSTRAINT `SchedulingLock_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchedulingLock` ADD CONSTRAINT `SchedulingLock_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingHold` ADD CONSTRAINT `BookingHold_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingHold` ADD CONSTRAINT `BookingHold_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingHoldSegment` ADD CONSTRAINT `BookingHoldSegment_holdId_fkey` FOREIGN KEY (`holdId`) REFERENCES `BookingHold`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingHoldSegment` ADD CONSTRAINT `BookingHoldSegment_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `ServiceOffering`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingHoldSegment` ADD CONSTRAINT `BookingHoldSegment_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingHoldSegment` ADD CONSTRAINT `BookingHoldSegment_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingOrder` ADD CONSTRAINT `BookingOrder_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingOrder` ADD CONSTRAINT `BookingOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingSegment` ADD CONSTRAINT `BookingSegment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `BookingOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingSegment` ADD CONSTRAINT `BookingSegment_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `ServiceOffering`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingSegment` ADD CONSTRAINT `BookingSegment_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingSegment` ADD CONSTRAINT `BookingSegment_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingOverride` ADD CONSTRAINT `BookingOverride_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `BookingSegment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
