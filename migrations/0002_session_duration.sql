-- How long the courts are booked for (minutes). Drives the rounds estimate.
ALTER TABLE `game_sessions` ADD COLUMN `duration_min` integer;
