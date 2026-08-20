-- Baseline the legacy AuditLog table.
--
-- AuditLog predates this project's adoption of Prisma migrations: it has
-- always existed on the real (Clever Cloud) database, so no prior migration
-- ever created it, and every migration that touches AuditLog (see
-- 20260818150000_marketplace_scheduling) only ALTERs it. A database built
-- from this migration history alone -- a fresh environment, CI, or a
-- disaster-recovery restore with no legacy dump -- would fail applying that
-- ALTER because the table never existed. This migration is a no-op on any
-- database where AuditLog already exists (IF NOT EXISTS) and creates the
-- exact current shape on any database where it does not, so the full
-- migration history becomes self-sufficient from empty going forward.
CREATE TABLE IF NOT EXISTS `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `spaId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `actorRole` ENUM('USER', 'OWNER', 'EMPLOYEE', 'ACCOUNTANT', 'ADMIN') NOT NULL DEFAULT 'OWNER',
    `action` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_spaId_idx`(`spaId`),
    INDEX `AuditLog_bookingId_idx`(`bookingId`),
    INDEX `AuditLog_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Baseline a second legacy column: Booking.createdByRole predates migration
-- history the same way AuditLog does. MySQL has no `ADD COLUMN IF NOT
-- EXISTS` (that is a MariaDB extension), so this uses a conditional
-- prepared statement against information_schema instead.
SET @addCreatedByRole = (SELECT IF(
    NOT EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Booking' AND COLUMN_NAME = 'createdByRole'
    ),
    'ALTER TABLE `Booking` ADD COLUMN `createdByRole` ENUM(''USER'', ''OWNER'', ''EMPLOYEE'', ''ACCOUNTANT'', ''ADMIN'') NOT NULL DEFAULT ''USER''',
    'SELECT 1'
));
PREPARE addCreatedByRoleStmt FROM @addCreatedByRole;
EXECUTE addCreatedByRoleStmt;
DEALLOCATE PREPARE addCreatedByRoleStmt;
