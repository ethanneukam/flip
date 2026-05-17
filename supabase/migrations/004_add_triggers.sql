-- 004_add_triggers.sql
-- Adds all system triggers. Depends on:
--   - 000_base_schema.sql (flip_items, market_signals, users, watchlist_items)
--   - 001_add_predictions.sql (predictions, signal_retry_queue)
--   - 002_add_notification_tables.sql (notification_queue)
-- Requires: pg_net extension enabled

-- Ensure pg_net is available (will error if not — fail fast)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- TRIGGER 1: flip_item created → fire compute-market-signal
-- Also inserts into signal_retry_queue as resilience mechanism.
-- If the HTTP call succeeds, /api/compute-market-signal deletes
-- the queue entry. If it fails, the retry cron picks it up.
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_market_signal_compute()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into retry queue (belt-and-suspenders resilience)
  INSERT INTO signal_retry_queue (flip_item_id, status, attempts, created_at)
  VALUES (NEW.id, 'pending', 0, now());

  -- Fire optimistic HTTP call to Vercel (non-blocking via pg_net)
  PERFORM net.http_post(
    url := current_setting('app.vercel_api_url') || '/api/compute-market-signal',
    body := json_build_object('flipItemId', NEW.id)::text,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.api_secret')
    )::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_flip_item_created ON flip_items;
CREATE TRIGGER trg_after_flip_item_created
  AFTER INSERT ON flip_items
  FOR EACH ROW EXECUTE FUNCTION trigger_market_signal_compute();

-- ============================================================
-- TRIGGER 2: market signal written → evaluate notification rules
-- Fires on INSERT or UPDATE of market_signals.
-- Checks for >10% price change and >20 point demand surge.
-- Inserts into notification_queue for affected watchlist users.
-- ============================================================

CREATE OR REPLACE FUNCTION evaluate_notification_rules()
RETURNS TRIGGER AS $$
DECLARE
  old_avg NUMERIC := COALESCE(OLD.avg_price, 0);
  new_avg NUMERIC := NEW.avg_price;
  pct_change NUMERIC;
BEGIN
  -- Skip if this is the first signal (no old price to compare)
  IF old_avg = 0 THEN RETURN NEW; END IF;

  pct_change := ABS((new_avg - old_avg) / old_avg);

  -- PRICE_SPIKE: price increased >10%
  IF new_avg > old_avg AND pct_change > 0.10 THEN
    INSERT INTO notification_queue (user_id, event_type, flip_item_id, payload, created_at)
    SELECT w.user_id, 'PRICE_SPIKE', NEW.flip_item_id,
      json_build_object(
        'oldPrice', old_avg,
        'newPrice', new_avg,
        'pctChange', ROUND(pct_change * 100, 1)
      )::jsonb, now()
    FROM watchlist_items w WHERE w.flip_item_id = NEW.flip_item_id;
  END IF;

  -- PRICE_DROP: price decreased >10%
  IF new_avg < old_avg AND pct_change > 0.10 THEN
    INSERT INTO notification_queue (user_id, event_type, flip_item_id, payload, created_at)
    SELECT w.user_id, 'PRICE_DROP', NEW.flip_item_id,
      json_build_object(
        'oldPrice', old_avg,
        'newPrice', new_avg,
        'pctChange', ROUND(pct_change * 100, 1)
      )::jsonb, now()
    FROM watchlist_items w WHERE w.flip_item_id = NEW.flip_item_id;
  END IF;

  -- DEMAND_SURGE: demand score jumped >20 points
  IF NEW.demand_score > COALESCE(OLD.demand_score, 0) + 20 THEN
    INSERT INTO notification_queue (user_id, event_type, flip_item_id, payload, created_at)
    SELECT w.user_id, 'DEMAND_SURGE', NEW.flip_item_id,
      json_build_object(
        'newDemandScore', NEW.demand_score
      )::jsonb, now()
    FROM watchlist_items w WHERE w.flip_item_id = NEW.flip_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_market_signal_upsert ON market_signals;
CREATE TRIGGER trg_after_market_signal_upsert
  AFTER INSERT OR UPDATE ON market_signals
  FOR EACH ROW EXECUTE FUNCTION evaluate_notification_rules();

-- ============================================================
-- TRIGGER 3: prediction resolved → update rep_score on users
-- Only fires when prediction transitions from pending → resolved
-- and accuracy_delta is set.
-- ============================================================

CREATE OR REPLACE FUNCTION update_rep_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status = 'pending' AND NEW.accuracy_delta IS NOT NULL THEN
    UPDATE users
    SET
      rep_score = GREATEST(0, LEAST(100, rep_score + (NEW.accuracy_delta * 100))),
      total_flips = total_flips + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rep_score ON predictions;
CREATE TRIGGER trg_update_rep_score
  AFTER UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_rep_score();

-- ============================================================
-- TRIGGER 4: prediction resolved → queue notification
-- Fires when prediction transitions from pending → resolved.
-- Queues a PREDICTION_RESOLVED notification for the user.
-- ============================================================

CREATE OR REPLACE FUNCTION notify_prediction_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status = 'pending' THEN
    INSERT INTO notification_queue (user_id, event_type, flip_item_id, payload, created_at)
    VALUES (
      NEW.user_id, 'PREDICTION_RESOLVED', NEW.flip_item_id,
      json_build_object(
        'outcome', NEW.outcome,
        'entryPrice', NEW.entry_price,
        'resolvedPrice', NEW.resolved_price,
        'horizonDays', NEW.horizon_days,
        'accuracyDelta', NEW.accuracy_delta
      )::jsonb,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_prediction_resolved ON predictions;
CREATE TRIGGER trg_notify_prediction_resolved
  AFTER UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION notify_prediction_resolved();
