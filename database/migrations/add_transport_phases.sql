-- Migration: Add transport phases and in_transit status
-- Description: Adds 'transport_start' and 'transport_arrival' to allocation_events and 'in_transit' to machines status.

-- 1. Update allocation_events event_type constraint
ALTER TABLE allocation_events DROP CONSTRAINT IF EXISTS allocation_events_event_type_check;
ALTER TABLE allocation_events ADD CONSTRAINT allocation_events_event_type_check 
    CHECK (event_type IN (
        'start_allocation',
        'end_allocation',
        'downtime_start',
        'downtime_end',
        'correction',
        'extension_attach',
        'extension_detach',
        'transport_start',
        'transport_arrival',
        'request_allocation',
        'refueling',
        'monitoring'
    ));

-- 2. Update machines status constraint
ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_status_check;
ALTER TABLE machines ADD CONSTRAINT machines_status_check 
    CHECK (status IN ('available', 'allocated', 'maintenance', 'inactive', 'in_transit'));

-- 3. Add comment to explain transport phases
COMMENT ON COLUMN allocation_events.event_type IS 'Tipo de evento: transport_start (início do deslocamento), transport_arrival (chegada ao destino)';
