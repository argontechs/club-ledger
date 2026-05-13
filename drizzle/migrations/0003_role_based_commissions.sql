-- Role-based commissions migration
-- DDL + data backfill in one file. Drizzle runs this via db:migrate.

-- 1. Extend roles
ALTER TABLE `roles`
  ADD COLUMN `tier` ENUM('admin','ambassador') NOT NULL DEFAULT 'ambassador',
  ADD COLUMN `base_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `bonus_rate` DECIMAL(5,2) NULL,
  ADD COLUMN `kpi_threshold` DECIMAL(12,2) NULL,
  ADD COLUMN `requires_kpi` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `is_system` TINYINT NOT NULL DEFAULT 0;
--> statement-breakpoint

-- 2. Widen the name column from 20 → 40 chars
ALTER TABLE `roles` MODIFY COLUMN `name` VARCHAR(40) NOT NULL;
--> statement-breakpoint

-- 3. Capture current global rates
SET @default_rate := COALESCE(
  (SELECT CAST(value AS DECIMAL(5,2)) FROM `settings` WHERE `key`='default_commission_rate'),
  8.00);
--> statement-breakpoint
SET @bonus_rate := COALESCE(
  (SELECT CAST(value AS DECIMAL(5,2)) FROM `settings` WHERE `key`='bonus_rate'),
  1.00);
--> statement-breakpoint

-- 4. Backfill role config
UPDATE `roles` SET tier='admin', base_rate=@default_rate, bonus_rate=@bonus_rate, is_system=1 WHERE name='owner';
--> statement-breakpoint
UPDATE `roles` SET tier='admin', base_rate=@default_rate, bonus_rate=@bonus_rate, is_system=1 WHERE name='admin';
--> statement-breakpoint
UPDATE `roles` SET tier='ambassador', base_rate=@default_rate, bonus_rate=NULL, is_system=0 WHERE name IN ('leader','ambassador');
--> statement-breakpoint

-- 5. Add role_id to ambassadors
ALTER TABLE `ambassadors` ADD COLUMN `role_id` INT NULL;
--> statement-breakpoint

-- 6. Default every ambassador to 'ambassador' role
UPDATE `ambassadors` SET `role_id` = (SELECT id FROM `roles` WHERE name='ambassador' LIMIT 1);
--> statement-breakpoint

-- 7. Override for ambassadors linked to owner/admin users
UPDATE `ambassadors` `a`
  JOIN `users` `u` ON `u`.`ambassador_id` = `a`.`id`
  JOIN `roles` `r` ON `r`.`id` = `u`.`role_id`
  SET `a`.`role_id` = `u`.`role_id`
  WHERE `r`.`name` IN ('owner','admin');
--> statement-breakpoint

-- 8. Enforce NOT NULL and add foreign key
ALTER TABLE `ambassadors` MODIFY COLUMN `role_id` INT NOT NULL;
--> statement-breakpoint
ALTER TABLE `ambassadors` ADD CONSTRAINT `fk_ambassadors_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`);
--> statement-breakpoint

-- 9. Drop the old per-ambassador commission rate
ALTER TABLE `ambassadors` DROP COLUMN `commission_rate`;
--> statement-breakpoint

-- 10. Add snapshot columns to payouts
ALTER TABLE `payouts`
  ADD COLUMN `snapshot_bonus_rate` DECIMAL(5,2) NULL,
  ADD COLUMN `snapshot_kpi_threshold` DECIMAL(12,2) NULL,
  ADD COLUMN `snapshot_requires_kpi` TINYINT NULL;
--> statement-breakpoint

-- 11. Remove retired settings keys
DELETE FROM `settings` WHERE `key` IN ('default_commission_rate','bonus_rate');
