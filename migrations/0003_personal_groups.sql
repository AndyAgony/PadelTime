-- A silently-created "personal" crew per user so sessions can be made without
-- picking a group first. Named crews stay optional.
ALTER TABLE `groups` ADD COLUMN `is_personal` integer NOT NULL DEFAULT 0;
