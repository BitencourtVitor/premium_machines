-- ============================================
-- Migration: Adicionar suporte a manutenção
-- ============================================
-- Adiciona campos e opções necessárias para rastreabilidade de manutenção

-- 1. Adicionar campo supplier_type na tabela suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(20) DEFAULT 'rental' 
CHECK (supplier_type IN ('rental', 'maintenance', 'both'));

-- Comentário
COMMENT ON COLUMN suppliers.supplier_type IS 'Tipo de fornecedor: rental (aluguel), maintenance (manutenção), both (ambos)';

-- 2. Adicionar campo supplier_id na tabela allocation_events
-- (para rastrear mecânico/prestador quando for manutenção de máquina própria)
ALTER TABLE allocation_events
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Índice para supplier_id em allocation_events
CREATE INDEX IF NOT EXISTS idx_events_supplier ON allocation_events(supplier_id);

-- Comentário
COMMENT ON COLUMN allocation_events.supplier_id IS 'Referência ao fornecedor/mecânico responsável (usado principalmente para manutenção de máquinas próprias)';

-- 3. Adicionar 'maintenance' como opção de downtime_reason
-- Primeiro, remover a constraint existente
ALTER TABLE allocation_events
DROP CONSTRAINT IF EXISTS allocation_events_downtime_reason_check;

-- Adicionar nova constraint com 'maintenance'
ALTER TABLE allocation_events
ADD CONSTRAINT allocation_events_downtime_reason_check 
CHECK (downtime_reason IS NULL OR downtime_reason IN (
  'defect',
  'lack_of_supplies',
  'weather',
  'lack_of_operator',
  'holiday',
  'maintenance',
  'other'
));

-- Comentário
COMMENT ON COLUMN allocation_events.downtime_reason IS 'Motivo da parada: defect, lack_of_supplies, weather, lack_of_operator, holiday, maintenance, other';

-- 4. Atualizar fornecedores existentes para ter supplier_type = 'rental' (padrão)
UPDATE suppliers 
SET supplier_type = 'rental' 
WHERE supplier_type IS NULL;
