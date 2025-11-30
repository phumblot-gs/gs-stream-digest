CREATE TABLE "digest_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp,
	"updated_at" timestamp,
	"created_by" text,
	CONSTRAINT "digest_applications_value_unique" UNIQUE("value")
);
--> statement-breakpoint
CREATE TABLE "digest_event_types" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"category" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp,
	"updated_at" timestamp,
	"created_by" text,
	CONSTRAINT "digest_event_types_value_unique" UNIQUE("value")
);
--> statement-breakpoint
CREATE TABLE "digest_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"role" text NOT NULL,
	"rate_limit" integer DEFAULT 60 NOT NULL,
	"last_used_at" timestamp,
	"last_used_ip" text,
	"use_count" integer DEFAULT 0,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by" text,
	"revoke_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "digest_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "digest_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"digest_id" text NOT NULL,
	"run_at" timestamp DEFAULT now() NOT NULL,
	"run_type" text DEFAULT 'scheduled' NOT NULL,
	"events_count" integer DEFAULT 0 NOT NULL,
	"events" text DEFAULT '[]' NOT NULL,
	"event_uid_start" text,
	"event_uid_end" text,
	"emails_sent" integer DEFAULT 0 NOT NULL,
	"emails_failed" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"duration_ms" integer,
	"triggered_by" text,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "digest_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"account_id" text,
	"is_global" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"subject_liquid" text NOT NULL,
	"body_html_liquid" text NOT NULL,
	"body_text_liquid" text,
	"preview_data" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_digests" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"account_id" text NOT NULL,
	"filters" text DEFAULT '{}' NOT NULL,
	"schedule" text NOT NULL,
	"timezone" text DEFAULT 'Europe/Paris' NOT NULL,
	"recipients" text DEFAULT '[]' NOT NULL,
	"test_recipients" text DEFAULT '[]',
	"template_id" text,
	"last_event_uid" text,
	"last_check_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_email_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"digest_run_id" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"resend_id" text,
	"resend_status" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"first_opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp,
	"error" text,
	"open_count" integer DEFAULT 0,
	"click_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "digest_email_logs_resend_id_unique" UNIQUE("resend_id")
);
--> statement-breakpoint
CREATE TABLE "digest_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"event_id" text NOT NULL,
	"email_log_id" text,
	"resend_id" text,
	"payload" text NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp,
	"error" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "digest_webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "digest_email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"account_id" text,
	"is_global" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"subject_liquid" text NOT NULL,
	"body_html_liquid" text NOT NULL,
	"body_text_liquid" text,
	"preview_data" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "digest_runs" ADD CONSTRAINT "digest_runs_digest_id_digest_digests_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."digest_digests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_digests" ADD CONSTRAINT "digest_digests_template_id_digest_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."digest_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_email_logs" ADD CONSTRAINT "digest_email_logs_digest_run_id_digest_runs_id_fk" FOREIGN KEY ("digest_run_id") REFERENCES "public"."digest_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_webhook_events" ADD CONSTRAINT "digest_webhook_events_email_log_id_digest_email_logs_id_fk" FOREIGN KEY ("email_log_id") REFERENCES "public"."digest_email_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_keys_user" ON "digest_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_keys_account" ON "digest_api_keys" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_keys_prefix" ON "digest_api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_runs_digest" ON "digest_runs" USING btree ("digest_id");--> statement-breakpoint
CREATE INDEX "idx_runs_date" ON "digest_runs" USING btree ("run_at");--> statement-breakpoint
CREATE INDEX "idx_runs_status" ON "digest_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_templates_account" ON "digest_templates" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_templates_global" ON "digest_templates" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "idx_digests_account" ON "digest_digests" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_digests_active" ON "digest_digests" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_digests_template" ON "digest_digests" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_emails_run" ON "digest_email_logs" USING btree ("digest_run_id");--> statement-breakpoint
CREATE INDEX "idx_emails_recipient" ON "digest_email_logs" USING btree ("recipient");--> statement-breakpoint
CREATE INDEX "idx_emails_resend" ON "digest_email_logs" USING btree ("resend_id");--> statement-breakpoint
CREATE INDEX "idx_emails_status" ON "digest_email_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhook_email" ON "digest_webhook_events" USING btree ("email_log_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_type" ON "digest_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_webhook_processed" ON "digest_webhook_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_email_templates_account" ON "digest_email_templates" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_email_templates_global" ON "digest_email_templates" USING btree ("is_global");