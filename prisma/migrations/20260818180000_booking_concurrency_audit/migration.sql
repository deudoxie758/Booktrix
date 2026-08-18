-- AlterTable
ALTER TABLE `BookingOrder` ADD COLUMN `sourceHoldToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `BookingOrder_sourceHoldToken_key` ON `BookingOrder`(`sourceHoldToken`);

-- AddForeignKey
ALTER TABLE `BookingOrder` ADD CONSTRAINT `BookingOrder_sourceHoldToken_fkey`
    FOREIGN KEY (`sourceHoldToken`) REFERENCES `BookingHold`(`token`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Replace the cascading override relation so immutable evidence prevents
-- deletion of its booking segment.
ALTER TABLE `BookingOverride` DROP FOREIGN KEY `BookingOverride_segmentId_fkey`;
ALTER TABLE `BookingOverride` ADD CONSTRAINT `BookingOverride_segmentId_fkey`
    FOREIGN KEY (`segmentId`) REFERENCES `BookingSegment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Booking overrides are append-only evidence.
CREATE TRIGGER `BookingOverride_prevent_update`
BEFORE UPDATE ON `BookingOverride`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BookingOverride records are immutable';

CREATE TRIGGER `BookingOverride_prevent_delete`
BEFORE DELETE ON `BookingOverride`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BookingOverride records are immutable';
