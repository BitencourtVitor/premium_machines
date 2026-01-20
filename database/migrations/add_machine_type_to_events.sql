-- Adicionar machine_type_id à tabela allocation_events e permitir machine_id nulo
-- Migration: add_machine_type_to_events.sql

-- 1. Adicionar a coluna machine_type_id
ALTER TABLE allocation_events 
ADD COLUMN IF NOT EXISTS machine_type_id UUID REFERENCES machine_types(id) ON DELETE SET NULL;

COMMENT ON COLUMN allocation_events.machine_type_id IS 'ID do tipo de máquina solicitado (usado em request_allocation e request_maintenance)';

-- 2. Garantir que machine_id e site_id possam ser nulos (remover restrição NOT NULL se existir)
ALTER TABLE allocation_events ALTER COLUMN machine_id DROP NOT NULL;
ALTER TABLE allocation_events ALTER COLUMN site_id DROP NOT NULL;

-- 3. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_events_machine_type ON allocation_events(machine_type_id);
