DROP INDEX `idx_overrides_template_time`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_overrides_template_time` ON `task_overrides` (`template_id`,`instance_datetime`);