CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role` text NOT NULL,
	`rate_limit` integer DEFAULT 60 NOT NULL,
	`last_used_at` integer,
	`last_used_ip` text,
	`use_count` integer DEFAULT 0,
	`expires_at` integer,
	`revoked_at` integer,
	`revoked_by` text,
	`revoke_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_keys_user` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_keys_account` ON `api_keys` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_keys_prefix` ON `api_keys` (`key_prefix`);--> statement-breakpoint
CREATE TABLE `digest_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`digest_id` text NOT NULL,
	`run_at` integer DEFAULT (unixepoch()) NOT NULL,
	`run_type` text DEFAULT 'scheduled' NOT NULL,
	`events_count` integer DEFAULT 0 NOT NULL,
	`events` text DEFAULT '[]' NOT NULL,
	`event_uid_start` text,
	`event_uid_end` text,
	`emails_sent` integer DEFAULT 0 NOT NULL,
	`emails_failed` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`duration_ms` integer,
	`triggered_by` text,
	`completed_at` integer,
	FOREIGN KEY (`digest_id`) REFERENCES `digests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_runs_digest` ON `digest_runs` (`digest_id`);--> statement-breakpoint
CREATE INDEX `idx_runs_date` ON `digest_runs` (`run_at`);--> statement-breakpoint
CREATE INDEX `idx_runs_status` ON `digest_runs` (`status`);--> statement-breakpoint
CREATE TABLE `digest_templates` (
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
CREATE INDEX `idx_templates_account` ON `digest_templates` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_templates_global` ON `digest_templates` (`is_global`);--> statement-breakpoint
CREATE TABLE `digests` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`account_id` text NOT NULL,
	`filters` text DEFAULT '{}' NOT NULL,
	`schedule` text NOT NULL,
	`timezone` text DEFAULT 'Europe/Paris' NOT NULL,
	`recipients` text DEFAULT '[]' NOT NULL,
	`test_recipients` text DEFAULT '[]',
	`template_id` text,
	`last_event_uid` text,
	`last_check_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`is_paused` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `digest_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_digests_account` ON `digests` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_digests_active` ON `digests` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_digests_template` ON `digests` (`template_id`);--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`digest_run_id` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`resend_id` text,
	`resend_status` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`delivered_at` integer,
	`opened_at` integer,
	`first_opened_at` integer,
	`clicked_at` integer,
	`bounced_at` integer,
	`error` text,
	`open_count` integer DEFAULT 0,
	`click_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`digest_run_id`) REFERENCES `digest_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_logs_resend_id_unique` ON `email_logs` (`resend_id`);--> statement-breakpoint
CREATE INDEX `idx_emails_run` ON `email_logs` (`digest_run_id`);--> statement-breakpoint
CREATE INDEX `idx_emails_recipient` ON `email_logs` (`recipient`);--> statement-breakpoint
CREATE INDEX `idx_emails_resend` ON `email_logs` (`resend_id`);--> statement-breakpoint
CREATE INDEX `idx_emails_status` ON `email_logs` (`status`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`event_id` text NOT NULL,
	`email_log_id` text,
	`resend_id` text,
	`payload` text NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`processed_at` integer,
	`error` text,
	`received_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`email_log_id`) REFERENCES `email_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_events_event_id_unique` ON `webhook_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_email` ON `webhook_events` (`email_log_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_type` ON `webhook_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_webhook_processed` ON `webhook_events` (`processed`);