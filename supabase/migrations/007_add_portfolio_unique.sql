-- 007_add_portfolio_unique.sql
-- Prevents duplicate portfolio entries for the same user + item.
-- Depends on: 000_base_schema.sql (portfolio_entries table)

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_entries_unique
ON portfolio_entries(user_id, flip_item_id);
