ALTER TABLE allocation_events
  ADD COLUMN IF NOT EXISTS used_by                   JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS allocation_subcontractors JSONB DEFAULT '[]';
