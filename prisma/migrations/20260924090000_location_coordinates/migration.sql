ALTER TABLE `Location`
  ADD COLUMN `latitude` DECIMAL(9, 6) NULL,
  ADD COLUMN `longitude` DECIMAL(9, 6) NULL,
  ADD COLUMN `coordinateSource` VARCHAR(20) NULL;
