-- Multi-club foundation: clubs table, club scoping on roles/teams/ambassadors/
-- sales/payouts, and the staff-vs-commission roles split.
-- DDL + data backfill in one file (precedent: 0003). Existing data becomes club #1.
-- Roles split: club_id NULL = company staff role (referenced by user logins);
-- club_id = N = commission role of club N (referenced by ambassadors).

CREATE TABLE `clubs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`logo_path` varchar(500),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	CONSTRAINT `clubs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `clubs` (`id`, `name`, `logo_path`)
SELECT 1,
  COALESCE(NULLIF((SELECT `value` FROM `settings` WHERE `key` = 'venue_name'), ''), 'Nono Club'),
  NULLIF((SELECT `value` FROM `settings` WHERE `key` = 'company_logo_path'), '');
--> statement-breakpoint
ALTER TABLE `roles` ADD `club_id` int;
--> statement-breakpoint
ALTER TABLE `roles` DROP INDEX `roles_name_unique`;
--> statement-breakpoint
UPDATE `roles` r SET r.`club_id` = 1
WHERE NOT EXISTS (SELECT 1 FROM `users` u WHERE u.`role_id` = r.`id`);
--> statement-breakpoint
INSERT INTO `roles` (`name`, `tier`, `base_rate`, `bonus_rate`, `kpi_threshold`, `requires_kpi`, `is_system`, `club_id`)
SELECT r.`name`, r.`tier`, r.`base_rate`, r.`bonus_rate`, r.`kpi_threshold`, r.`requires_kpi`, 0, 1
FROM `roles` r
WHERE r.`club_id` IS NULL
  AND EXISTS (SELECT 1 FROM `ambassadors` a WHERE a.`role_id` = r.`id`);
--> statement-breakpoint
UPDATE `ambassadors` a
JOIN `roles` old ON old.`id` = a.`role_id` AND old.`club_id` IS NULL
JOIN `roles` cpy ON cpy.`club_id` = 1 AND cpy.`name` = old.`name` AND cpy.`id` <> old.`id`
SET a.`role_id` = cpy.`id`;
--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_club_name_unique` UNIQUE(`club_id`,`name`);
--> statement-breakpoint
ALTER TABLE `teams` ADD `club_id` int;
--> statement-breakpoint
UPDATE `teams` SET `club_id` = 1;
--> statement-breakpoint
ALTER TABLE `teams` MODIFY `club_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `ambassadors` ADD `club_id` int;
--> statement-breakpoint
UPDATE `ambassadors` SET `club_id` = 1;
--> statement-breakpoint
ALTER TABLE `ambassadors` MODIFY `club_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales` ADD `club_id` int;
--> statement-breakpoint
UPDATE `sales` SET `club_id` = 1;
--> statement-breakpoint
ALTER TABLE `sales` MODIFY `club_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `payouts` ADD `club_id` int;
--> statement-breakpoint
UPDATE `payouts` SET `club_id` = 1;
--> statement-breakpoint
ALTER TABLE `payouts` MODIFY `club_id` int NOT NULL;
--> statement-breakpoint
CREATE INDEX `ambassadors_by_club` ON `ambassadors` (`club_id`);
--> statement-breakpoint
CREATE INDEX `payouts_by_club` ON `payouts` (`club_id`,`period_month`);
--> statement-breakpoint
CREATE INDEX `roles_by_club` ON `roles` (`club_id`);
--> statement-breakpoint
CREATE INDEX `sales_by_club` ON `sales` (`club_id`,`date`);
--> statement-breakpoint
CREATE INDEX `teams_by_club` ON `teams` (`club_id`);
--> statement-breakpoint
DELETE FROM `settings` WHERE `key` IN ('venue_name','company_logo_path');
