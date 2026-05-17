-- 002_add_notification_tables.sql
-- Adds notification queue (for async delivery) and notifications inbox (permanent record).
-- Depends on: 000_base_schema.sql (users, flip_items)

CREATE TABLE notification_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  flip_item_id  UUID REFERENCES flip_items(id) ON DELETE SET NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ
);

CREATE INDEX idx_notif_queue_pending ON notification_queue(status) WHERE status = 'pending';

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  flip_item_id  UUID REFERENCES flip_items(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
