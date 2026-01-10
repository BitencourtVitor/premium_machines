-- ============================================
-- Sistema de Gestão de Máquinas - Schema SQL
-- Premium Machines
-- Arquitetura orientada a eventos
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TABELA: users (Usuários)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    pin_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'dev', 'operador', 'fornecedor')),
    -- Permissões
    can_view_dashboard BOOLEAN DEFAULT false,
    can_view_map BOOLEAN DEFAULT false,
    can_manage_sites BOOLEAN DEFAULT false,
    can_manage_machines BOOLEAN DEFAULT false,
    can_register_events BOOLEAN DEFAULT false,
    can_approve_events BOOLEAN DEFAULT false,
    can_view_financial BOOLEAN DEFAULT false,
    can_manage_suppliers BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_view_logs BOOLEAN DEFAULT false,
    -- Vínculo com fornecedor (para role 'fornecedor')
    supplier_id UUID,
    validado BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_nome ON users(nome);
CREATE INDEX IF NOT EXISTS idx_users_validado ON users(validado);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_supplier_id ON users(supplier_id);

-- ============================================
-- 2. TABELA: suppliers (Fornecedores)
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    supplier_type VARCHAR(20) DEFAULT 'rental' CHECK (supplier_type IN ('rental', 'maintenance', 'both')),
    ativo BOOLEAN DEFAULT true,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nome)
);

-- Índices para suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_nome ON suppliers(nome);
CREATE INDEX IF NOT EXISTS idx_suppliers_ativo ON suppliers(ativo);
CREATE INDEX IF NOT EXISTS idx_suppliers_archived ON suppliers(archived);

-- Adicionar FK de users para suppliers
ALTER TABLE users ADD CONSTRAINT fk_users_supplier 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- ============================================
-- 3. TABELA: sites (Jobsites / Endereços)
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    geocoding_confidence DECIMAL(3, 2),
    place_type VARCHAR(100),
    city VARCHAR(255),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Brasil',
    ativo BOOLEAN DEFAULT true,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para sites
CREATE INDEX IF NOT EXISTS idx_sites_title ON sites(title);
CREATE INDEX IF NOT EXISTS idx_sites_ativo ON sites(ativo);
CREATE INDEX IF NOT EXISTS idx_sites_location ON sites(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sites_city ON sites(city);

-- ============================================
-- 4. TABELA: machine_types (Tipos de Máquina)
-- ============================================
CREATE TABLE IF NOT EXISTS machine_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    is_attachment BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nome)
);

-- Índices para machine_types
CREATE INDEX IF NOT EXISTS idx_machine_types_nome ON machine_types(nome);
CREATE INDEX IF NOT EXISTS idx_machine_types_is_attachment ON machine_types(is_attachment);

-- ============================================
-- 5. TABELA: machines (Máquinas)
-- ============================================
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_number VARCHAR(50) NOT NULL,
    machine_type_id UUID NOT NULL REFERENCES machine_types(id) ON DELETE RESTRICT,
    ownership_type VARCHAR(20) NOT NULL CHECK (ownership_type IN ('owned', 'rented')),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    -- Dados de cobrança (apenas para máquinas alugadas)
    billing_type VARCHAR(20) CHECK (billing_type IN ('daily', 'weekly', 'monthly')),
    daily_rate DECIMAL(15, 2),
    weekly_rate DECIMAL(15, 2),
    monthly_rate DECIMAL(15, 2),
    -- Status atual
    current_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'maintenance', 'inactive')),
    notas TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(unit_number)
);

-- Índices para machines
CREATE INDEX IF NOT EXISTS idx_machines_unit_number ON machines(unit_number);
CREATE INDEX IF NOT EXISTS idx_machines_type ON machines(machine_type_id);
CREATE INDEX IF NOT EXISTS idx_machines_ownership ON machines(ownership_type);
CREATE INDEX IF NOT EXISTS idx_machines_supplier ON machines(supplier_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_current_site ON machines(current_site_id);

-- ============================================
-- 6. TABELA: extension_types (Tipos de Extensão)
-- ============================================
CREATE TABLE IF NOT EXISTS extension_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    compatible_machine_types UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nome)
);

-- Índices para extension_types
CREATE INDEX IF NOT EXISTS idx_extension_types_nome ON extension_types(nome);

-- ============================================
-- 7. TABELA: machine_extensions (Extensões de Máquina)
-- ============================================
CREATE TABLE IF NOT EXISTS machine_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_number VARCHAR(50) NOT NULL,
    extension_type_id UUID NOT NULL REFERENCES extension_types(id) ON DELETE RESTRICT,
    ownership_type VARCHAR(20) NOT NULL CHECK (ownership_type IN ('owned', 'rented')),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    -- Dados de cobrança
    billing_type VARCHAR(20) CHECK (billing_type IN ('daily', 'weekly', 'monthly')),
    daily_rate DECIMAL(15, 2),
    weekly_rate DECIMAL(15, 2),
    monthly_rate DECIMAL(15, 2),
    -- Status
    current_machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'attached', 'maintenance', 'inactive')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(unit_number)
);

-- Índices para machine_extensions
CREATE INDEX IF NOT EXISTS idx_extensions_unit_number ON machine_extensions(unit_number);
CREATE INDEX IF NOT EXISTS idx_extensions_type ON machine_extensions(extension_type_id);
CREATE INDEX IF NOT EXISTS idx_extensions_machine ON machine_extensions(current_machine_id);

-- ============================================
-- 8. TABELA: allocation_events (Eventos de Alocação)
-- Coração do sistema - arquitetura orientada a eventos
-- ============================================
CREATE TABLE IF NOT EXISTS allocation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Tipo de evento
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'start_allocation',
        'end_allocation',
        'downtime_start',
        'downtime_end',
        'correction',
        'extension_attach',
        'extension_detach'
    )),
    -- Referências principais
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
    site_id UUID REFERENCES sites(id) ON DELETE RESTRICT,
    extension_id UUID REFERENCES machine_extensions(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    -- Localização específica dentro do site
    construction_type VARCHAR(20) CHECK (construction_type IN ('lot', 'building')),
    lot_building_number VARCHAR(50),
    -- Dados temporais
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    -- Motivo da parada (para downtime)
    downtime_reason VARCHAR(100) CHECK (downtime_reason IN (
        'defect',
        'lack_of_supplies',
        'weather',
        'lack_of_operator',
        'holiday',
        'maintenance',
        'other'
    )),
    downtime_description TEXT,
    -- Workflow de aprovação
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    -- Correção (referência ao evento original se for uma correção)
    corrects_event_id UUID REFERENCES allocation_events(id) ON DELETE SET NULL,
    correction_description TEXT,
    -- Metadados
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para allocation_events
CREATE INDEX IF NOT EXISTS idx_events_type ON allocation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_machine ON allocation_events(machine_id);
CREATE INDEX IF NOT EXISTS idx_events_site ON allocation_events(site_id);
CREATE INDEX IF NOT EXISTS idx_events_supplier ON allocation_events(supplier_id);
CREATE INDEX IF NOT EXISTS idx_events_construction_type ON allocation_events(construction_type);
CREATE INDEX IF NOT EXISTS idx_events_lot_building_number ON allocation_events(lot_building_number);
CREATE INDEX IF NOT EXISTS idx_events_date ON allocation_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON allocation_events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON allocation_events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_corrects ON allocation_events(corrects_event_id);

-- ============================================
-- 9. TABELA: financial_snapshots (Snapshots Financeiros)
-- Tabela derivada, não editável manualmente
-- ============================================
CREATE TABLE IF NOT EXISTS financial_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    extension_id UUID REFERENCES machine_extensions(id) ON DELETE SET NULL,
    -- Período
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Dados calculados
    total_days INTEGER NOT NULL DEFAULT 0,
    downtime_days INTEGER NOT NULL DEFAULT 0,
    billable_days INTEGER NOT NULL DEFAULT 0,
    -- Valores
    daily_rate DECIMAL(15, 2),
    estimated_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    -- Metadados
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para financial_snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_site ON financial_snapshots(site_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_machine ON financial_snapshots(machine_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_supplier ON financial_snapshots(supplier_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_period ON financial_snapshots(period_start, period_end);

-- ============================================
-- 10. TABELA: audit_logs (Log de Alterações)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entidade VARCHAR(100) NOT NULL,
    entidade_id UUID NOT NULL,
    acao VARCHAR(50) NOT NULL CHECK (acao IN ('insert', 'update', 'delete')),
    dados_antes JSONB,
    dados_depois JSONB,
    usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidade ON audit_logs(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 11. TABELA: login_attempts (Tentativas de Login)
-- ============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) NOT NULL,
    attempts INTEGER DEFAULT 0,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para login_attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);

-- ============================================
-- 12. FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_types_updated_at
    BEFORE UPDATE ON machine_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extensions_updated_at
    BEFORE UPDATE ON machine_extensions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON allocation_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. VIEWS PARA RELATÓRIOS
-- ============================================

-- View: Status atual das máquinas com localização
CREATE OR REPLACE VIEW vw_machines_status AS
SELECT 
    m.id AS machine_id,
    m.unit_number,
    mt.nome AS machine_type,
    m.ownership_type,
    s.nome AS supplier_name,
    m.status,
    site.title AS current_site,
    site.latitude,
    site.longitude,
    site.city,
    m.created_at
FROM machines m
LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
LEFT JOIN suppliers s ON m.supplier_id = s.id
LEFT JOIN sites site ON m.current_site_id = site.id
WHERE m.ativo = true;

-- View: Resumo de alocações por jobsite
CREATE OR REPLACE VIEW vw_site_allocations AS
SELECT 
    s.id AS site_id,
    s.title AS site_title,
    s.city,
    COUNT(DISTINCT m.id) AS machines_count,
    COUNT(DISTINCT CASE WHEN m.ownership_type = 'rented' THEN m.id END) AS rented_count,
    COUNT(DISTINCT CASE WHEN m.ownership_type = 'owned' THEN m.id END) AS owned_count
FROM sites s
LEFT JOIN machines m ON s.id = m.current_site_id AND m.status = 'allocated'
WHERE s.ativo = true
GROUP BY s.id, s.title, s.city;

-- View: Eventos pendentes de aprovação
CREATE OR REPLACE VIEW vw_pending_events AS
SELECT 
    ae.id AS event_id,
    ae.event_type,
    m.unit_number,
    mt.nome AS machine_type,
    s.title AS site_title,
    ae.event_date,
    ae.downtime_reason,
    u.nome AS created_by_name,
    ae.created_at
FROM allocation_events ae
INNER JOIN machines m ON ae.machine_id = m.id
LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
LEFT JOIN sites s ON ae.site_id = s.id
INNER JOIN users u ON ae.created_by = u.id
WHERE ae.status = 'pending'
ORDER BY ae.created_at DESC;

-- ============================================
-- 14. COMENTÁRIOS NAS TABELAS
-- ============================================
COMMENT ON TABLE users IS 'Usuários do sistema com suas permissões e roles';
COMMENT ON TABLE suppliers IS 'Fornecedores de máquinas alugadas e/ou prestadores de manutenção';
COMMENT ON COLUMN suppliers.supplier_type IS 'Tipo de fornecedor: rental (aluguel), maintenance (manutenção), both (ambos)';
COMMENT ON COLUMN allocation_events.supplier_id IS 'Referência ao fornecedor/mecânico responsável (usado principalmente para manutenção de máquinas próprias)';
COMMENT ON COLUMN allocation_events.construction_type IS 'Tipo de construção: "lot" (Lote) ou "building" (Prédio/Edifício). Indica a localização específica dentro do site.';
COMMENT ON COLUMN allocation_events.lot_building_number IS 'Número do lote ou prédio onde a máquina está alocada. Especifica a localização exata dentro do site.';
COMMENT ON COLUMN allocation_events.site_id IS 'Referência ao site (jobsite) que indica a área geral/redondeza. A localização específica é definida por construction_type e lot_building_number.';
COMMENT ON TABLE sites IS 'Jobsites/endereços onde máquinas operam (geocodificados). O campo address é o identificador único do endereço. O title representa o bairro/jobsite e pode ser usado para agrupar múltiplos endereços.';
COMMENT ON TABLE machine_types IS 'Tipos de máquinas e attachments/extensions disponíveis no sistema';
COMMENT ON COLUMN machine_types.is_attachment IS 'Indica se o tipo é um Attachment/Extension (true) ou uma máquina principal (false)';
COMMENT ON TABLE machines IS 'Máquinas físicas únicas identificadas por unit_number';
COMMENT ON TABLE extension_types IS 'Tipos de extensões/acessórios para máquinas';
COMMENT ON TABLE machine_extensions IS 'Extensões físicas para máquinas';
COMMENT ON TABLE allocation_events IS 'Eventos imutáveis que registram toda a operação';
COMMENT ON TABLE financial_snapshots IS 'Snapshots derivados para análise financeira';
COMMENT ON TABLE audit_logs IS 'Histórico imutável de alterações no sistema';

-- ============================================
-- FIM DO SCHEMA
-- ============================================
