CREATE TABLE `GuestBookingAccess` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `GuestBookingAccess_tokenHash_key`(`tokenHash`),
  INDEX `GuestBookingAccess_orderId_expiresAt_idx`(`orderId`, `expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GuestBookingAccess_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `BookingOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
