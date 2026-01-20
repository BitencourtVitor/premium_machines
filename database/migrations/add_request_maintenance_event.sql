-- Adiciona o tipo 'request_maintenance' ao CHECK constraint da tabela allocation_events.
-- Note: Esta lista inclui todos os tipos de eventos suportados pelas migrações anteriores
-- para evitar erros de violação de constraint com dados existentes.

DO $$
BEGIN
    -- 1. Remover o constraint antigo
    ALTER TABLE allocation_events DROP CONSTRAINT IF EXISTS allocation_events_event_type_check;

    -- 2. Adicionar o novo constraint com a lista completa e o novo 'request_maintenance'
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
        'confirm_allocation',
        'material_entry',
        'product_exit',
        'refueling',
        'monitoring',
        'request_maintenance'
    ));
    
    -- 3. Atualizar o comentário da coluna
    COMMENT ON COLUMN allocation_events.event_type IS 'Tipo do evento: start_allocation, end_allocation, downtime_start, downtime_end, correction, extension_attach, extension_detach, transport_start, transport_arrival, request_allocation, confirm_allocation, material_entry, product_exit, refueling, monitoring, request_maintenance';
END $$;
