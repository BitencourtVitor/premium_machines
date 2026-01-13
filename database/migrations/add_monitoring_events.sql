-- Adicionar novos tipos de eventos: entrada de materiais, saída de produtos, abastecimento
-- Migration: add_monitoring_events.sql

ALTER TABLE allocation_events
DROP CONSTRAINT IF EXISTS allocation_events_event_type_check;

ALTER TABLE allocation_events
ADD CONSTRAINT allocation_events_event_type_check
CHECK (event_type IN (
    'request_allocation',
    'confirm_allocation',
    'start_allocation',
    'end_allocation',
    'downtime_start',
    'downtime_end',
    'correction',
    'extension_attach',
    'extension_detach',
    'material_entry',
    'product_exit',
    'refueling'
));

COMMENT ON COLUMN allocation_events.event_type IS 'Tipo do evento: request_allocation, confirm_allocation, start_allocation, end_allocation, downtime_start, downtime_end, correction, extension_attach, extension_detach, material_entry, product_exit, refueling';
