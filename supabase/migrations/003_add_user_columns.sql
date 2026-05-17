-- 003_add_user_columns.sql
-- Adds mobile-app-specific columns to users table if they don't already exist.
-- Safe to run on both fresh and existing schemas (uses IF NOT EXISTS pattern).
-- Depends on: 000_base_schema.sql (users)

-- Add expo_push_token if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'expo_push_token'
  ) THEN
    ALTER TABLE users ADD COLUMN expo_push_token TEXT;
  END IF;
END $$;

-- Add notification_prefs if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'notification_prefs'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_prefs JSONB NOT NULL DEFAULT '{
      "PRICE_SPIKE": true,
      "PRICE_DROP": true,
      "DEMAND_SURGE": true,
      "PORTFOLIO_GAIN": false,
      "PORTFOLIO_LOSS": true,
      "RANK_UP": true,
      "PREDICTION_RESOLVED": true
    }';
  END IF;
END $$;

-- Add daily_scan_count if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'daily_scan_count'
  ) THEN
    ALTER TABLE users ADD COLUMN daily_scan_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add scan_limit if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'scan_limit'
  ) THEN
    ALTER TABLE users ADD COLUMN scan_limit INTEGER NOT NULL DEFAULT 5;
  END IF;
END $$;

-- Add scans_reset_at if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'scans_reset_at'
  ) THEN
    ALTER TABLE users ADD COLUMN scans_reset_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Add rep_score if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'rep_score'
  ) THEN
    ALTER TABLE users ADD COLUMN rep_score NUMERIC(5,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add total_flips if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_flips'
  ) THEN
    ALTER TABLE users ADD COLUMN total_flips INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add is_pro if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_pro'
  ) THEN
    ALTER TABLE users ADD COLUMN is_pro BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
