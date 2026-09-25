CREATE TABLE `StorefrontSlugRedirect` (
  `id` VARCHAR(191) NOT NULL,
  `businessId` VARCHAR(191) NOT NULL,
  `oldSlug` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `StorefrontSlugRedirect_oldSlug_key`(`oldSlug`),
  INDEX `StorefrontSlugRedirect_businessId_createdAt_idx`(`businessId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `StorefrontSlugRedirect_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
