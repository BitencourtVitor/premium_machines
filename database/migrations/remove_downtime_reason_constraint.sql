-- Migration: Remove downtime_reason check constraint from allocation_events
-- Created at: 2026-01-30

ALTER TABLE public.allocation_events 
DROP CONSTRAINT IF EXISTS allocation_events_downtime_reason_check;
