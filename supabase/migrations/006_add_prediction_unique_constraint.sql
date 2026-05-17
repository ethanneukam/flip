-- 006_add_prediction_unique_constraint.sql
-- Prevents duplicate pending predictions for the same user + item.
-- Depends on: 001_add_predictions.sql (predictions table)

CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_unique_pending
ON predictions(user_id, flip_item_id)
WHERE status = 'pending';
