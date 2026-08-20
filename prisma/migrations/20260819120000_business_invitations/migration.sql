-- CreateTable
CREATE TABLE `BusinessInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `normalizedEmail` VARCHAR(191) NOT NULL,
    `invitedName` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MANAGER', 'ACCOUNTS', 'STAFF') NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `inviterId` VARCHAR(191) NOT NULL,
    `activeKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BusinessInvitation_tokenHash_key`(`tokenHash`),
    UNIQUE INDEX `BusinessInvitation_activeKey_key`(`activeKey`),
    INDEX `BusinessInvitation_business_email_state_idx`(`businessId`, `normalizedEmail`, `acceptedAt`, `revokedAt`),
    INDEX `BusinessInvitation_business_expiry_state_idx`(`businessId`, `expiresAt`, `acceptedAt`, `revokedAt`),
    INDEX `BusinessInvitation_inviterId_createdAt_idx`(`inviterId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessInvitationLocation` (
    `invitationId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BusinessInvitationLocation_locationId_idx`(`locationId`),
    PRIMARY KEY (`invitationId`, `locationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessInvitationQualification` (
    `invitationId` VARCHAR(191) NOT NULL,
    `offeringId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BusinessInvitationQualification_offeringId_locationId_idx`(`offeringId`, `locationId`),
    INDEX `BusinessInvitationQualification_locationId_idx`(`locationId`),
    PRIMARY KEY (`invitationId`, `offeringId`, `locationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Restrictive foreign keys retain invitation history and prevent removal of
-- referenced tenant, inviter, location, or offering records.
ALTER TABLE `BusinessInvitation` ADD CONSTRAINT `BusinessInvitation_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BusinessInvitation` ADD CONSTRAINT `BusinessInvitation_inviterId_fkey` FOREIGN KEY (`inviterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BusinessInvitationLocation` ADD CONSTRAINT `BusinessInvitationLocation_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `BusinessInvitation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BusinessInvitationLocation` ADD CONSTRAINT `BusinessInvitationLocation_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BusinessInvitationQualification` ADD CONSTRAINT `BusinessInvitationQualification_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `BusinessInvitation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BusinessInvitationQualification` ADD CONSTRAINT `BusinessInvitationQualification_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `ServiceOffering`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BusinessInvitationQualification` ADD CONSTRAINT `BusinessInvitationQualification_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
