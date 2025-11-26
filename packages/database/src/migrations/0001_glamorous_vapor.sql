CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_value_unique` ON `applications` (`value`);--> statement-breakpoint
CREATE TABLE `event_types` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` text,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_types_value_unique` ON `event_types` (`value`);