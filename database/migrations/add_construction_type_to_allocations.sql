-- ============================================
-- Migration: Adicionar campos de localização específica em alocações
-- ============================================
-- 
-- O site_id indica a "redondeza" geral, mas cada máquina precisa
-- ser alocada para um local específico (Lot ou Building + número)
-- ============================================

-- Adicionar campo construction_type (Lot ou Building)
ALTER TABLE allocation_events
ADD COLUMN IF NOT EXISTS construction_type VARCHAR(20) 
    CHECK (construction_type IN ('lot', 'building')) NULL;

-- Adicionar campo lot_building_number (número do lote ou prédio)
ALTER TABLE allocation_events
ADD COLUMN IF NOT EXISTS lot_building_number VARCHAR(50) NULL;

-- Criar índices para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_events_construction_type 
    ON allocation_events(construction_type);

CREATE INDEX IF NOT EXISTS idx_events_lot_building_number 
    ON allocation_events(lot_building_number);

-- Comentários para documentação
COMMENT ON COLUMN allocation_events.construction_type IS 
    'Tipo de construção: "lot" (Lote) ou "building" (Prédio/Edifício). Indica a localização específica dentro do site.';

COMMENT ON COLUMN allocation_events.lot_building_number IS 
    'Número do lote ou prédio onde a máquina está alocada. Especifica a localização exata dentro do site.';

COMMENT ON COLUMN allocation_events.site_id IS 
    'Referência ao site (jobsite) que indica a área geral/redondeza. A localização específica é definida por construction_type e lot_building_number.';
