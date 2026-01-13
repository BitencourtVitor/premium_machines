-- Tabela para fila de retentativa de eventos rejeitados/falhos
CREATE TABLE IF NOT EXISTS event_retry_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES allocation_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Usuário que tentou a ação (rejeição)
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('reject', 'approve')),
    reason TEXT, -- Motivo da rejeição ou contexto
    error_details JSONB, -- Detalhes técnicos do erro
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'retried', 'failed', 'resolved')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_retry_queue_status ON event_retry_queue(status);
CREATE INDEX IF NOT EXISTS idx_retry_queue_next_retry ON event_retry_queue(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_retry_queue_event_id ON event_retry_queue(event_id);

-- Trigger para updated_at
CREATE TRIGGER update_event_retry_queue_updated_at
    BEFORE UPDATE ON event_retry_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE event_retry_queue IS 'Fila de retentativa para operações de eventos que falharam ou foram rejeitadas com erro';
