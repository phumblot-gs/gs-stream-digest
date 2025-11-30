-- Grant permissions on digest_* tables to digestuser
-- This script ensures digestuser can only access tables with digest_ prefix

-- Grant basic connection rights (already done via role, but explicit is good)
GRANT CONNECT ON DATABASE "fly-db" TO digestuser;
GRANT USAGE ON SCHEMA public TO digestuser;

-- Grant permissions on all current digest_* tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_applications TO digestuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_event_types TO digestuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_api_keys TO digestuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_runs TO digestuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_templates TO digestuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_digests TO digestuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_email_logs TO digestuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_webhook_events TO digestuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE digest_email_templates TO digestuser;

-- Grant sequence permissions (for auto-increment if we add any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO digestuser;

-- Verify permissions
\z digest_*
