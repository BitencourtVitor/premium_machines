-- Migration: Atualizar tabela suppliers
-- Remove campos desnecessários e adiciona campo archived

-- Remover colunas que não são mais necessárias
ALTER TABLE suppliers DROP COLUMN IF EXISTS cnpj;
ALTER TABLE suppliers DROP COLUMN IF EXISTS endereco;
ALTER TABLE suppliers DROP COLUMN IF EXISTS contato_nome;

-- Adicionar coluna archived
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Criar índice para archived
CREATE INDEX IF NOT EXISTS idx_suppliers_archived ON suppliers(archived);

-- Comentário na coluna
COMMENT ON COLUMN suppliers.archived IS 'Indica se o fornecedor está arquivado (não deletado, mantém histórico)';
