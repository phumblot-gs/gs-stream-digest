CREATE TABLE `digest_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`account_id` text,
	`permissions` text DEFAULT 'read' NOT NULL,
	`is_active` integer DEFAULT true,
	`last_used_at` integer,
	`expires_at` integer,
	`created_at` integer,
	`created_by` text,
	`revoked_at` integer,
	`revoked_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `digest_api_keys_key_hash_unique` ON `digest_api_keys` (`key_hash`);
