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

-- Booking overrides are append-only evidence.
CREATE TRIGGER `BookingOverride_prevent_update`
BEFORE UPDATE ON `BookingOverride`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BookingOverride records are immutable';

CREATE TRIGGER `BookingOverride_prevent_delete`
BEFORE DELETE ON `BookingOverride`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BookingOverride records are immutable';
