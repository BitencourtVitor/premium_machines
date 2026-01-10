-- ============================================
-- RLS (Row Level Security) Policies
-- Premium Machines
-- ============================================

-- Função helper para obter o user_id atual da sessão
-- Esta função será chamada pelas políticas RLS
-- Nota: Como usamos autenticação customizada, precisamos usar uma abordagem diferente
-- Vamos criar uma função que pode ser configurada via SET LOCAL em transações

-- Função para obter o usuário atual do contexto da sessão
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Tenta obter do contexto da sessão (será definido pela aplicação)
  RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o role do usuário atual
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS VARCHAR AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o supplier_id do usuário atual
CREATE OR REPLACE FUNCTION current_user_supplier_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_supplier_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário tem permissão específica
CREATE OR REPLACE FUNCTION user_has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
  user_record RECORD;
BEGIN
  user_id := current_user_id();
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO user_record FROM users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Admin e dev têm todas as permissões
  IF user_record.role IN ('admin', 'dev') THEN
    RETURN TRUE;
  END IF;

  -- Verifica permissão específica
  CASE permission_name
    WHEN 'can_view_dashboard' THEN RETURN user_record.can_view_dashboard;
    WHEN 'can_view_map' THEN RETURN user_record.can_view_map;
    WHEN 'can_manage_sites' THEN RETURN user_record.can_manage_sites;
    WHEN 'can_manage_machines' THEN RETURN user_record.can_manage_machines;
    WHEN 'can_register_events' THEN RETURN user_record.can_register_events;
    WHEN 'can_approve_events' THEN RETURN user_record.can_approve_events;
    WHEN 'can_view_financial' THEN RETURN user_record.can_view_financial;
    WHEN 'can_manage_suppliers' THEN RETURN user_record.can_manage_suppliers;
    WHEN 'can_manage_users' THEN RETURN user_record.can_manage_users;
    WHEN 'can_view_logs' THEN RETURN user_record.can_view_logs;
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para executar uma query com contexto de usuário
-- Esta função permite configurar o contexto do usuário antes de executar queries
CREATE OR REPLACE FUNCTION exec_with_user_context(
  p_user_id UUID,
  p_user_role VARCHAR,
  p_user_supplier_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Configura as variáveis de sessão para esta transação
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
  PERFORM set_config('app.current_user_role', p_user_role, true);
  IF p_user_supplier_id IS NOT NULL THEN
    PERFORM set_config('app.current_user_supplier_id', p_user_supplier_id::TEXT, true);
  ELSE
    PERFORM set_config('app.current_user_supplier_id', '', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA: users
-- ============================================

-- Admin e dev podem ver todos os usuários
CREATE POLICY "users_select_admin_dev"
  ON users FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- Operadores podem ver apenas usuários validados (para seleção em formulários)
CREATE POLICY "users_select_operators"
  ON users FOR SELECT
  USING (
    current_user_role() = 'operador' AND validado = true
  );

-- Fornecedores podem ver apenas a si mesmos
CREATE POLICY "users_select_suppliers"
  ON users FOR SELECT
  USING (
    current_user_role() = 'fornecedor' AND id = current_user_id()
  );

-- Apenas admin e dev podem inserir usuários
CREATE POLICY "users_insert_admin_dev"
  ON users FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev')
  );

-- Apenas admin e dev podem atualizar usuários
CREATE POLICY "users_update_admin_dev"
  ON users FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- Apenas admin e dev podem deletar usuários
CREATE POLICY "users_delete_admin_dev"
  ON users FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- ============================================
-- POLÍTICAS PARA: suppliers
-- ============================================

-- Admin, dev e operadores com permissão podem ver todos os fornecedores
CREATE POLICY "suppliers_select_all"
  ON suppliers FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_suppliers'))
  );

-- Fornecedores podem ver apenas seu próprio registro
CREATE POLICY "suppliers_select_own"
  ON suppliers FOR SELECT
  USING (
    current_user_role() = 'fornecedor' AND id = current_user_supplier_id()
  );

-- Apenas admin, dev e operadores com permissão podem inserir
CREATE POLICY "suppliers_insert"
  ON suppliers FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_suppliers'))
  );

-- Apenas admin, dev e operadores com permissão podem atualizar
CREATE POLICY "suppliers_update"
  ON suppliers FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_suppliers'))
  );

-- Apenas admin e dev podem deletar
CREATE POLICY "suppliers_delete"
  ON suppliers FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- ============================================
-- POLÍTICAS PARA: sites
-- ============================================

-- Admin, dev e operadores com permissão podem ver todos os sites
CREATE POLICY "sites_select_all"
  ON sites FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND (
      user_has_permission('can_view_map') OR
      user_has_permission('can_manage_sites') OR
      user_has_permission('can_register_events')
    ))
  );

-- Apenas admin, dev e operadores com permissão podem inserir
CREATE POLICY "sites_insert"
  ON sites FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_sites'))
  );

-- Apenas admin, dev e operadores com permissão podem atualizar
CREATE POLICY "sites_update"
  ON sites FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_sites'))
  );

-- Apenas admin e dev podem deletar
CREATE POLICY "sites_delete"
  ON sites FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- ============================================
-- POLÍTICAS PARA: machine_types
-- ============================================

-- Todos os usuários autenticados podem ver tipos de máquina
CREATE POLICY "machine_types_select"
  ON machine_types FOR SELECT
  USING (
    current_user_id() IS NOT NULL
  );

-- Apenas admin e dev podem inserir
CREATE POLICY "machine_types_insert"
  ON machine_types FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev')
  );

-- Apenas admin e dev podem atualizar
CREATE POLICY "machine_types_update"
  ON machine_types FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- Apenas admin e dev podem deletar
CREATE POLICY "machine_types_delete"
  ON machine_types FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- ============================================
-- POLÍTICAS PARA: machines
-- ============================================

-- Admin, dev e operadores com permissão podem ver todas as máquinas
CREATE POLICY "machines_select_all"
  ON machines FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND (
      user_has_permission('can_view_map') OR
      user_has_permission('can_manage_machines') OR
      user_has_permission('can_register_events')
    ))
  );

-- Fornecedores podem ver apenas máquinas do seu supplier_id
CREATE POLICY "machines_select_supplier"
  ON machines FOR SELECT
  USING (
    current_user_role() = 'fornecedor' AND supplier_id = current_user_supplier_id()
  );

-- Apenas admin, dev e operadores com permissão podem inserir
CREATE POLICY "machines_insert"
  ON machines FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_machines'))
  );

-- Apenas admin, dev e operadores com permissão podem atualizar
CREATE POLICY "machines_update"
  ON machines FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_machines'))
  );

-- Apenas admin e dev podem deletar
CREATE POLICY "machines_delete"
  ON machines FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- ============================================
-- POLÍTICAS PARA: extension_types
-- ============================================

-- Todos os usuários autenticados podem ver tipos de extensão
CREATE POLICY "extension_types_select"
  ON extension_types FOR SELECT
  USING (
    current_user_id() IS NOT NULL
  );

-- Apenas admin e dev podem inserir
CREATE POLICY "extension_types_insert"
  ON extension_types FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev')
  );

-- Apenas admin e dev podem atualizar
CREATE POLICY "extension_types_update"
  ON extension_types FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- Apenas admin e dev podem deletar
CREATE POLICY "extension_types_delete"
  ON extension_types FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- ============================================
-- POLÍTICAS PARA: machine_extensions
-- ============================================

-- Admin, dev e operadores com permissão podem ver todas as extensões
CREATE POLICY "machine_extensions_select_all"
  ON machine_extensions FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND (
      user_has_permission('can_view_map') OR
      user_has_permission('can_manage_machines') OR
      user_has_permission('can_register_events')
    ))
  );

-- Fornecedores podem ver apenas extensões do seu supplier_id
CREATE POLICY "machine_extensions_select_supplier"
  ON machine_extensions FOR SELECT
  USING (
    current_user_role() = 'fornecedor' AND supplier_id = current_user_supplier_id()
  );

-- Apenas admin, dev e operadores com permissão podem inserir
CREATE POLICY "machine_extensions_insert"
  ON machine_extensions FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_machines'))
  );

-- Apenas admin, dev e operadores com permissão podem atualizar
CREATE POLICY "machine_extensions_update"
  ON machine_extensions FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_machines'))
  );

-- Apenas admin e dev podem deletar
CREATE POLICY "machine_extensions_delete"
  ON machine_extensions FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- ============================================
-- POLÍTICAS PARA: allocation_events
-- ============================================

-- Admin, dev e operadores com permissão podem ver todos os eventos
CREATE POLICY "allocation_events_select_all"
  ON allocation_events FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND (
      user_has_permission('can_view_dashboard') OR
      user_has_permission('can_register_events') OR
      user_has_permission('can_approve_events') OR
      user_has_permission('can_view_financial')
    ))
  );

-- Fornecedores podem ver eventos de máquinas/extensões do seu supplier_id
CREATE POLICY "allocation_events_select_supplier"
  ON allocation_events FOR SELECT
  USING (
    current_user_role() = 'fornecedor' AND (
      EXISTS (
        SELECT 1 FROM machines m 
        WHERE m.id = allocation_events.machine_id 
        AND m.supplier_id = current_user_supplier_id()
      ) OR
      EXISTS (
        SELECT 1 FROM machine_extensions me 
        WHERE me.id = allocation_events.extension_id 
        AND me.supplier_id = current_user_supplier_id()
      )
    )
  );

-- Apenas admin, dev e operadores com permissão podem inserir eventos
CREATE POLICY "allocation_events_insert"
  ON allocation_events FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_register_events'))
  );

-- Apenas admin, dev e operadores com permissão podem atualizar (aprov/rejeitar)
CREATE POLICY "allocation_events_update"
  ON allocation_events FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_approve_events'))
  );

-- Apenas admin e dev podem deletar eventos
CREATE POLICY "allocation_events_delete"
  ON allocation_events FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- ============================================
-- POLÍTICAS PARA: financial_snapshots
-- ============================================

-- Admin, dev e operadores com permissão podem ver todos os snapshots
CREATE POLICY "financial_snapshots_select_all"
  ON financial_snapshots FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_view_financial'))
  );

-- Fornecedores podem ver snapshots de máquinas/extensões do seu supplier_id
CREATE POLICY "financial_snapshots_select_supplier"
  ON financial_snapshots FOR SELECT
  USING (
    current_user_role() = 'fornecedor' AND (
      supplier_id = current_user_supplier_id() OR
      EXISTS (
        SELECT 1 FROM machines m 
        WHERE m.id = financial_snapshots.machine_id 
        AND m.supplier_id = current_user_supplier_id()
      ) OR
      EXISTS (
        SELECT 1 FROM machine_extensions me 
        WHERE me.id = financial_snapshots.extension_id 
        AND me.supplier_id = current_user_supplier_id()
      )
    )
  );

-- Snapshots são apenas leitura (gerados automaticamente)
-- Não permitimos INSERT, UPDATE ou DELETE manual

-- ============================================
-- POLÍTICAS PARA: audit_logs
-- ============================================

-- Admin, dev e operadores com permissão podem ver logs
CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_view_logs'))
  );

-- Logs são apenas leitura (gerados automaticamente por triggers)
-- Não permitimos INSERT, UPDATE ou DELETE manual

-- ============================================
-- POLÍTICAS PARA: login_attempts
-- ============================================

-- Apenas admin e dev podem ver tentativas de login
CREATE POLICY "login_attempts_select"
  ON login_attempts FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- Sistema pode inserir tentativas (via service role)
-- Não permitimos UPDATE ou DELETE manual

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION current_user_id() IS 'Retorna o ID do usuário atual do contexto da sessão';
COMMENT ON FUNCTION current_user_role() IS 'Retorna o role do usuário atual do contexto da sessão';
COMMENT ON FUNCTION current_user_supplier_id() IS 'Retorna o supplier_id do usuário atual do contexto da sessão';
COMMENT ON FUNCTION user_has_permission(TEXT) IS 'Verifica se o usuário atual tem uma permissão específica';
