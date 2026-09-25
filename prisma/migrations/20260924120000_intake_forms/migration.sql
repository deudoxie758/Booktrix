ALTER TABLE `BookingOrder`
  ADD COLUMN `intakeDefinition` JSON NULL,
  ADD COLUMN `intakeResponses` JSON NULL,
  ADD COLUMN `sensitiveIntakeCiphertext` TEXT NULL,
  ADD COLUMN `sensitiveIntakeIv` VARCHAR(32) NULL,
  ADD COLUMN `sensitiveIntakeTag` VARCHAR(32) NULL,
  ADD COLUMN `sensitiveConsentAt` DATETIME(3) NULL;

CREATE TABLE `IntakeTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `businessId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `IntakeTemplate_businessId_active_idx`(`businessId`, `active`),
  PRIMARY KEY (`id`),
  CONSTRAINT `IntakeTemplate_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `IntakeQuestion` (
  `id` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `stableKey` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `type` ENUM('SHORT_TEXT','LONG_TEXT','SINGLE_CHOICE','MULTIPLE_CHOICE','YES_NO','DATE','CONSENT') NOT NULL,
  `options` JSON NULL,
  `required` BOOLEAN NOT NULL DEFAULT false,
  `sensitive` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  UNIQUE INDEX `IntakeQuestion_templateId_stableKey_key`(`templateId`, `stableKey`),
  INDEX `IntakeQuestion_templateId_sortOrder_idx`(`templateId`, `sortOrder`),
  PRIMARY KEY (`id`),
  CONSTRAINT `IntakeQuestion_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `IntakeTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ServiceIntakeTemplate` (
  `offeringId` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  INDEX `ServiceIntakeTemplate_templateId_idx`(`templateId`),
  PRIMARY KEY (`offeringId`, `templateId`),
  CONSTRAINT `ServiceIntakeTemplate_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `ServiceOffering`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ServiceIntakeTemplate_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `IntakeTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SensitiveIntakeAccessAudit` (
  `id` VARCHAR(191) NOT NULL,
  `businessId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NOT NULL,
  `accessType` VARCHAR(191) NOT NULL DEFAULT 'VIEW',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `SensitiveIntakeAccessAudit_businessId_createdAt_idx`(`businessId`, `createdAt`),
  INDEX `SensitiveIntakeAccessAudit_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `SensitiveIntakeAccessAudit_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SensitiveIntakeAccessAudit_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SensitiveIntakeAccessAudit_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `BookingOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SensitiveIntakeAccessAudit_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
