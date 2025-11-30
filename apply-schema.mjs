import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'data/digest.db');
const db = new Database(dbPath);

// Create all tables with digest_ prefix
db.exec(`
CREATE TABLE IF NOT EXISTS digest_applications (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER,
  updated_at INTEGER,
  created_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS digest_applications_value_unique ON digest_applications (value);

CREATE TABLE IF NOT EXISTS digest_event_types (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER,
  updated_at INTEGER,
  created_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS digest_event_types_value_unique ON digest_event_types (value);

CREATE TABLE IF NOT EXISTS digest_api_keys (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  role TEXT NOT NULL,
  rate_limit INTEGER DEFAULT 60 NOT NULL,
  last_used_at INTEGER,
  last_used_ip TEXT,
  use_count INTEGER DEFAULT 0,
  expires_at INTEGER,
  revoked_at INTEGER,
  revoked_by TEXT,
  revoke_reason TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  created_by TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS digest_api_keys_key_hash_unique ON digest_api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_keys_user ON digest_api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_keys_account ON digest_api_keys (account_id);
CREATE INDEX IF NOT EXISTS idx_keys_prefix ON digest_api_keys (key_prefix);

CREATE TABLE IF NOT EXISTS digest_templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  account_id TEXT,
  is_global INTEGER DEFAULT 0 NOT NULL,
  is_default INTEGER DEFAULT 0 NOT NULL,
  subject_liquid TEXT NOT NULL,
  body_html_liquid TEXT NOT NULL,
  body_text_liquid TEXT,
  preview_data TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_templates_account ON digest_templates (account_id);
CREATE INDEX IF NOT EXISTS idx_templates_global ON digest_templates (is_global);

CREATE TABLE IF NOT EXISTS digest_digests (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  account_id TEXT NOT NULL,
  filters TEXT DEFAULT '{}' NOT NULL,
  schedule TEXT NOT NULL,
  timezone TEXT DEFAULT 'Europe/Paris' NOT NULL,
  recipients TEXT DEFAULT '[]' NOT NULL,
  test_recipients TEXT DEFAULT '[]',
  template_id TEXT,
  last_event_uid TEXT,
  last_check_at INTEGER,
  is_active INTEGER DEFAULT 1 NOT NULL,
  is_paused INTEGER DEFAULT 0 NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (template_id) REFERENCES digest_templates(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_digests_account ON digest_digests (account_id);
CREATE INDEX IF NOT EXISTS idx_digests_active ON digest_digests (is_active);
CREATE INDEX IF NOT EXISTS idx_digests_template ON digest_digests (template_id);

CREATE TABLE IF NOT EXISTS digest_runs (
  id TEXT PRIMARY KEY NOT NULL,
  digest_id TEXT NOT NULL,
  run_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  run_type TEXT DEFAULT 'scheduled' NOT NULL,
  events_count INTEGER DEFAULT 0 NOT NULL,
  events TEXT DEFAULT '[]' NOT NULL,
  event_uid_start TEXT,
  event_uid_end TEXT,
  emails_sent INTEGER DEFAULT 0 NOT NULL,
  emails_failed INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  error TEXT,
  duration_ms INTEGER,
  triggered_by TEXT,
  completed_at INTEGER,
  FOREIGN KEY (digest_id) REFERENCES digest_digests(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runs_digest ON digest_runs (digest_id);
CREATE INDEX IF NOT EXISTS idx_runs_date ON digest_runs (run_at);
CREATE INDEX IF NOT EXISTS idx_runs_status ON digest_runs (status);

CREATE TABLE IF NOT EXISTS digest_email_logs (
  id TEXT PRIMARY KEY NOT NULL,
  digest_run_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_id TEXT,
  resend_status TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  sent_at INTEGER,
  delivered_at INTEGER,
  opened_at INTEGER,
  first_opened_at INTEGER,
  clicked_at INTEGER,
  bounced_at INTEGER,
  error TEXT,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (digest_run_id) REFERENCES digest_runs(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS digest_email_logs_resend_id_unique ON digest_email_logs (resend_id);
CREATE INDEX IF NOT EXISTS idx_emails_run ON digest_email_logs (digest_run_id);
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON digest_email_logs (recipient);
CREATE INDEX IF NOT EXISTS idx_emails_resend ON digest_email_logs (resend_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON digest_email_logs (status);

CREATE TABLE IF NOT EXISTS digest_webhook_events (
  id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  email_log_id TEXT,
  resend_id TEXT,
  payload TEXT NOT NULL,
  processed INTEGER DEFAULT 0 NOT NULL,
  processed_at INTEGER,
  error TEXT,
  received_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (email_log_id) REFERENCES digest_email_logs(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS digest_webhook_events_event_id_unique ON digest_webhook_events (event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_email ON digest_webhook_events (email_log_id);
CREATE INDEX IF NOT EXISTS idx_webhook_type ON digest_webhook_events (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON digest_webhook_events (processed);

CREATE TABLE IF NOT EXISTS digest_email_templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  account_id TEXT,
  is_global INTEGER DEFAULT 0 NOT NULL,
  is_default INTEGER DEFAULT 0 NOT NULL,
  subject_liquid TEXT NOT NULL,
  body_html_liquid TEXT NOT NULL,
  body_text_liquid TEXT,
  preview_data TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_templates_account ON digest_email_templates (account_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_global ON digest_email_templates (is_global);
`);

db.close();
console.log('Schema applied successfully!');
