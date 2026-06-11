CREATE TABLE `sale_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`club_id` int NOT NULL,
	`name` varchar(40) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sale_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `sale_types_club_name_unique` UNIQUE(`club_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `sales` MODIFY COLUMN `type` varchar(40) NOT NULL;--> statement-breakpoint
CREATE INDEX `sale_types_by_club` ON `sale_types` (`club_id`);--> statement-breakpoint
-- Backfill: every existing club starts with the two historical categories.
INSERT INTO `sale_types` (`club_id`, `name`, `sort_order`)
SELECT c.`id`, 'Table', 0 FROM `clubs` c;
--> statement-breakpoint
INSERT INTO `sale_types` (`club_id`, `name`, `sort_order`)
SELECT c.`id`, 'BGO', 1 FROM `clubs` c;
