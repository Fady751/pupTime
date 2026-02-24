CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation` text NOT NULL,
	`entity_type` text NOT NULL,
	`local_id` text NOT NULL,
	`payload` text NOT NULL,
	`retry_count` integer DEFAULT 0,
	`last_error` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `task_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`instance_datetime` text NOT NULL,
	`status` text DEFAULT 'PENDING',
	`new_datetime` text,
	`is_deleted` integer DEFAULT false,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_overrides_template_id` ON `task_overrides` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_overrides_instance_time` ON `task_overrides` (`instance_datetime`);--> statement-breakpoint
CREATE INDEX `idx_overrides_template_time` ON `task_overrides` (`template_id`,`instance_datetime`);--> statement-breakpoint
CREATE TABLE `task_template_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` text NOT NULL,
	`category_id` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cat_template_id` ON `task_template_categories` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_cat_category_id` ON `task_template_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `task_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`title` text NOT NULL,
	`priority` text DEFAULT 'none',
	`emoji` text,
	`start_datetime` text,
	`reminder_time` integer,
	`duration_minutes` integer,
	`is_recurring` integer DEFAULT false,
	`rrule` text,
	`timezone` text DEFAULT 'UTC',
	`is_deleted` integer DEFAULT false,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_templates_user_id` ON `task_templates` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_templates_priority` ON `task_templates` (`priority`);--> statement-breakpoint
CREATE TABLE `user_categories` (
	`user_id` integer NOT NULL,
	`category_id` integer NOT NULL
);
