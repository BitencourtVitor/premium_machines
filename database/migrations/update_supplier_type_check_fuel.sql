-- ============================================
-- Migration: Atualizar constraint supplier_type para incluir 'fuel'
-- ============================================

-- 1. Remover a constraint existente
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_supplier_type_check;

-- 2. Adicionar nova constraint com 'fuel'
ALTER TABLE suppliers 
ADD CONSTRAINT suppliers_supplier_type_check 
CHECK (supplier_type IN ('rental', 'maintenance', 'both', 'fuel'));

-- 3. Atualizar comentário
COMMENT ON COLUMN suppliers.supplier_type IS 'Tipo de fornecedor: rental (aluguel), maintenance (manutenção), both (ambos), fuel (combustível)';
