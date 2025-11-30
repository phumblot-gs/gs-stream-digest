CREATE TABLE `email_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`account_id` text,
	`is_global` integer DEFAULT false NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`subject_liquid` text NOT NULL,
	`body_html_liquid` text NOT NULL,
	`body_text_liquid` text,
	`preview_data` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_email_templates_account` ON `email_templates` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_email_templates_global` ON `email_templates` (`is_global`);