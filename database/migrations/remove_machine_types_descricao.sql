-- ============================================
-- Migration: Remover coluna descricao de machine_types
-- Premium Machines
-- ============================================
-- Descrição: Remove a coluna descricao da tabela machine_types
-- Data: 2024

-- Remover coluna descricao se existir
ALTER TABLE machine_types 
DROP COLUMN IF EXISTS descricao;

-- Comentário
COMMENT ON TABLE machine_types IS 'Tipos de máquinas e attachments/extensions disponíveis no sistema (sem descrição)';
