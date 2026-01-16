-- ============================================
-- Migration: Corrigir FK de refueling_templates para suppliers
-- ============================================

-- 1. Limpar IDs antigos de fornecedores de combustível (pois a tabela antiga foi deletada)
UPDATE refueling_templates SET fuel_supplier_id = NULL;

-- 2. Remover constraint antiga se existir (nome genérico ou específico)
ALTER TABLE refueling_templates DROP CONSTRAINT IF EXISTS refueling_templates_fuel_supplier_id_fkey;

-- 3. Adicionar nova constraint apontando para a tabela suppliers
ALTER TABLE refueling_templates
ADD CONSTRAINT refueling_templates_fuel_supplier_id_fkey
FOREIGN KEY (fuel_supplier_id)
REFERENCES suppliers(id)
ON DELETE SET NULL;

-- 4. Comentário
COMMENT ON COLUMN refueling_templates.fuel_supplier_id IS 'Referência ao fornecedor de combustível (tabela suppliers)';
