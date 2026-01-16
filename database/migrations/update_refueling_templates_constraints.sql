-- Remove unique constraint on machine_id if it exists
-- We want to allow multiple templates for the same machine (e.g. refueling twice a week)
ALTER TABLE refueling_templates DROP CONSTRAINT IF EXISTS refueling_templates_machine_id_key;
ALTER TABLE refueling_templates DROP CONSTRAINT IF EXISTS refueling_templates_machine_id_unique;

-- Add composite unique constraint to prevent exact duplicates (same machine, same day, same time)
-- This ensures we don't accidentally create duplicate schedules while allowing:
-- Machine A, Monday, 08:00
-- Machine A, Thursday, 14:00
ALTER TABLE refueling_templates DROP CONSTRAINT IF EXISTS refueling_templates_machine_day_time_key;
ALTER TABLE refueling_templates ADD CONSTRAINT refueling_templates_machine_day_time_key UNIQUE (machine_id, day_of_week, time_of_day);
