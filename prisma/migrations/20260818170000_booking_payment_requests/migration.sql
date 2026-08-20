-- CreateTable
CREATE TABLE `BookingPaymentRequest` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'XCD',
    `reference` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `providerPaymentId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookingPaymentRequest_orderId_key`(`orderId`),
    UNIQUE INDEX `BookingPaymentRequest_reference_key`(`reference`),
    INDEX `BookingPaymentRequest_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `BookingPaymentRequest_provider_providerPaymentId_idx`(`provider`, `providerPaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BookingPaymentRequest` ADD CONSTRAINT `BookingPaymentRequest_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `BookingOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
