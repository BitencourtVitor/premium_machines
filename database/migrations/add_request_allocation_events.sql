-- Adicionar eventos de solicitação e confirmação de alocação
-- Migration: add_request_allocation_events.sql

-- Atualizar o CHECK constraint para incluir os novos tipos de evento
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
    'extension_detach'
));

-- Adicionar comentários explicativos
COMMENT ON COLUMN allocation_events.event_type IS 'Tipo do evento: request_allocation (solicitação), confirm_allocation (confirmação), start_allocation (início real), end_allocation (fim), downtime_start (início de parada), downtime_end (fim de parada), correction (correção), extension_attach (conexão de extensão), extension_detach (desconexão de extensão)';