-- Rename construction_type 'lot' → 'house' and clear lot numbers for house entries
UPDATE allocation_events
  SET construction_type = 'house',
      lot_building_number = NULL
  WHERE construction_type = 'lot';

-- Update CHECK constraint
ALTER TABLE allocation_events
  DROP CONSTRAINT IF EXISTS allocation_events_construction_type_check;

ALTER TABLE allocation_events
  ADD CONSTRAINT allocation_events_construction_type_check
  CHECK (construction_type IN ('house', 'building'));
