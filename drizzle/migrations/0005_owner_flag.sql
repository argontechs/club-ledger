ALTER TABLE `roles` ADD `is_owner` tinyint DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Backfill: the staff role literally named 'owner' is the owner anchor today.
UPDATE `roles` SET `is_owner` = 1 WHERE `name` = 'owner' AND `club_id` IS NULL;
