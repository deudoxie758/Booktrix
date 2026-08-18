-- AlterTable
ALTER TABLE `BookingOrder` ADD COLUMN `sourceHoldToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `BookingOrder_sourceHoldToken_key` ON `BookingOrder`(`sourceHoldToken`);

-- AddForeignKey
ALTER TABLE `BookingOrder` ADD CONSTRAINT `BookingOrder_sourceHoldToken_fkey`
    FOREIGN KEY (`sourceHoldToken`) REFERENCES `BookingHold`(`token`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Override evidence retains the historical segment identifier without a
-- foreign key so fixture cleanup cannot cascade or be blocked by it.
ALTER TABLE `BookingOverride` DROP FOREIGN KEY `BookingOverride_segmentId_fkey`;

-- Managed MySQL commonly prohibits database triggers when binary logging is
-- enabled. Override writes are therefore restricted to the application's
-- create-only repository boundary; no update/delete operation is exposed.
