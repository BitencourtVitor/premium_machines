CREATE TABLE IF NOT EXISTS allocation_event_confirmations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES allocation_events(id) ON DELETE CASCADE,
  confirmed_by    UUID NOT NULL REFERENCES users(id),
  confirmed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  attachment_url  TEXT NOT NULL,
  attachment_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);
