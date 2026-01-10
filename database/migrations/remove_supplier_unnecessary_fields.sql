-- ============================================
-- Migration: Remover campos desnecessários de suppliers
-- ============================================
-- Remove CNPJ, endereco e contato_nome (não necessários para sistema nos EUA)

-- 1. Remover coluna cnpj
ALTER TABLE suppliers DROP COLUMN IF EXISTS cnpj;

-- 2. Remover coluna endereco
ALTER TABLE suppliers DROP COLUMN IF EXISTS endereco;

-- 3. Remover coluna contato_nome
ALTER TABLE suppliers DROP COLUMN IF EXISTS contato_nome;
