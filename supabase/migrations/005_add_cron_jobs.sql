-- 005_add_cron_jobs.sql
-- Adds all scheduled cron jobs. Depends on:
--   - All prior migrations (tables, triggers, edge functions deployed)
-- Requires: pg_cron extension enabled
-- Requires: pg_net extension enabled (for HTTP calls)
-- Requires app settings:
--   app.supabase_url
--   app.vercel_api_url
--   app.service_role_key
--   app.api_secret
--   app.cron_secret

-- Ensure pg_cron is available (will error if not — fail fast)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================
-- CRON 1: Reset daily scan counts
-- Runs at midnight UTC every day.
-- Resets daily_scan_count to 0 for all users.
-- ============================================================

SELECT cron.schedule(
  'reset-daily-scans',
  '0 0 * * *',
  $$UPDATE users SET daily_scan_count = 0, scans_reset_at = now()$$
);

-- ============================================================
-- CRON 2: Resolve pending predictions
-- Runs every 6 hours.
-- Calls the resolve-predictions edge function.
-- ============================================================

SELECT cron.schedule(
  'resolve-predictions',
  '0 */6 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/resolve-predictions',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )::jsonb
  );$$
);

-- ============================================================
-- CRON 3: Recompute watchlist signals
-- Runs daily at 6:00 AM UTC.
-- Calls the Vercel batch-recompute-signals API route.
-- ============================================================

SELECT cron.schedule(
  'recompute-watchlist-signals',
  '0 6 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.vercel_api_url') || '/api/batch-recompute-signals',
    body := '{"scope":"watchlisted","limit":500}'::text,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    )::jsonb
  );$$
);

-- ============================================================
-- CRON 4: Process notification queue
-- Runs every 2 minutes.
-- Calls the process-notification-queue edge function.
-- ============================================================

SELECT cron.schedule(
  'process-notification-queue',
  '*/2 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-notification-queue',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )::jsonb
  );$$
);

-- ============================================================
-- CRON 5: Retry failed signal computations
-- Runs every 5 minutes.
-- Calls the compute-market-signal edge function (retry processor).
-- ============================================================

SELECT cron.schedule(
  'retry-signal-compute',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/compute-market-signal',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )::jsonb
  );$$
);
