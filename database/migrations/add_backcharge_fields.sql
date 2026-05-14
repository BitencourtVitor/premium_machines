ALTER TABLE allocation_events
  ADD COLUMN IF NOT EXISTS gera_backcharge          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS backcharge_suppliers     JSONB   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS subcontractor_receipt_links JSONB DEFAULT '[]';
