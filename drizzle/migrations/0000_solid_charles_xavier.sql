CREATE TABLE `ambassadors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`team_id` int,
	`commission_rate` decimal(5,2) NOT NULL DEFAULT '8.00',
	`is_protected` tinyint NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	CONSTRAINT `ambassadors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ambassador_id` int NOT NULL,
	`period_month` char(7) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`notes` text,
	`paid_at` datetime,
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `payouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(20) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`ambassador_id` int NOT NULL,
	`type` enum('Table','BGO') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`notes` text,
	`status` enum('draft','confirmed','voided') NOT NULL DEFAULT 'draft',
	`confirmed_commission_rate` decimal(5,2),
	`confirmed_bonus_rate` decimal(5,2),
	`external_order_id` varchar(50),
	`table_number` varchar(20),
	`created_by` int NOT NULL,
	`confirmed_at` datetime,
	`voided_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(60) NOT NULL,
	`value` text NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(160) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(120) NOT NULL,
	`role_id` int NOT NULL,
	`ambassador_id` int,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `payouts_by_amb_month` ON `payouts` (`ambassador_id`,`period_month`);--> statement-breakpoint
CREATE INDEX `sales_by_date` ON `sales` (`date`);--> statement-breakpoint
CREATE INDEX `sales_by_ambassador` ON `sales` (`ambassador_id`);--> statement-breakpoint
CREATE INDEX `sales_by_order_id` ON `sales` (`external_order_id`);