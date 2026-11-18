-- A completed booking can produce at most one verified review. MySQL permits
-- multiple NULL values in a unique index, so reviews without a legacy booking
-- reference remain valid.
CREATE UNIQUE INDEX `Review_bookingId_key` ON `Review`(`bookingId`);
