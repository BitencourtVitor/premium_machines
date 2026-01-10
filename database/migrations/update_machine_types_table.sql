-- ============================================
-- Migration: Atualizar tabela machine_types
-- Premium Machines
-- ============================================
-- Descrição: Adiciona coluna is_attachment e updated_at à tabela machine_types
-- Data: 2024

-- Adicionar coluna is_attachment (booleano para indicar se é Extension/Attachment ou máquina)
ALTER TABLE machine_types 
ADD COLUMN IF NOT EXISTS is_attachment BOOLEAN DEFAULT false NOT NULL;

-- Adicionar coluna updated_at
ALTER TABLE machine_types 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar trigger para atualizar updated_at automaticamente
-- Usa a função existente update_updated_at_column() se já existir
-- Caso contrário, cria a função
DO $$
BEGIN
  -- Verificar se a função já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    -- Criar função se não existir
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Remover trigger se já existir e criar novamente
DROP TRIGGER IF EXISTS update_machine_types_updated_at ON machine_types;
CREATE TRIGGER update_machine_types_updated_at
  BEFORE UPDATE ON machine_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar índice para is_attachment (útil para filtros)
CREATE INDEX IF NOT EXISTS idx_machine_types_is_attachment ON machine_types(is_attachment);

-- Comentários
COMMENT ON COLUMN machine_types.is_attachment IS 'Indica se o tipo é um Attachment/Extension (true) ou uma máquina principal (false)';
COMMENT ON COLUMN machine_types.updated_at IS 'Data e hora da última atualização do registro';

-- ============================================
-- Atualizar políticas RLS para machine_types
-- Permitir que operadores com can_manage_machines também possam gerenciar tipos
-- ============================================

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "machine_types_select" ON machine_types;
DROP POLICY IF EXISTS "machine_types_insert" ON machine_types;
DROP POLICY IF EXISTS "machine_types_update" ON machine_types;
DROP POLICY IF EXISTS "machine_types_delete" ON machine_types;

-- Nova política SELECT: Todos os usuários autenticados podem ver tipos de máquina
CREATE POLICY "machine_types_select"
  ON machine_types FOR SELECT
  USING (
    current_user_id() IS NOT NULL
  );

-- Nova política INSERT: Admin, dev e operadores com can_manage_machines podem inserir
CREATE POLICY "machine_types_insert"
  ON machine_types FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_machines'))
  );

-- Nova política UPDATE: Admin, dev e operadores com can_manage_machines podem atualizar
CREATE POLICY "machine_types_update"
  ON machine_types FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_machines'))
  );

-- Nova política DELETE: Admin, dev e operadores com can_manage_machines podem deletar
CREATE POLICY "machine_types_delete"
  ON machine_types FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_machines'))
  );

-- ============================================
-- Verificar se a tabela machines já tem machine_type_id
-- (Já deve existir, mas vamos garantir)
-- ============================================

-- Verificar se a coluna machine_type_id existe na tabela machines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'machines' 
    AND column_name = 'machine_type_id'
  ) THEN
    -- Se não existir, criar (mas provavelmente já existe)
    ALTER TABLE machines 
    ADD COLUMN machine_type_id UUID NOT NULL REFERENCES machine_types(id) ON DELETE RESTRICT;
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);
  END IF;
END $$;

-- Garantir que o índice existe
CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machine_type_id);

-- ============================================
-- Comentários finais
-- ============================================

COMMENT ON TABLE machine_types IS 'Tipos de máquinas e attachments/extensions disponíveis no sistema';
COMMENT ON INDEX idx_machine_types_is_attachment IS 'Índice para filtrar tipos de máquinas vs attachments';
