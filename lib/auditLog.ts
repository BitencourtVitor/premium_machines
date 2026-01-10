import { supabaseServer } from './supabase-server'

type AuditAction = 'insert' | 'update' | 'delete'

interface AuditLogParams {
  entidade: string
  entidade_id: string
  acao: AuditAction
  dados_antes?: any
  dados_depois?: any
  usuario_id?: string
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await supabaseServer.from('audit_logs').insert({
      entidade: params.entidade,
      entidade_id: params.entidade_id,
      acao: params.acao,
      dados_antes: params.dados_antes || null,
      dados_depois: params.dados_depois || null,
      usuario_id: params.usuario_id || null,
    })
  } catch (error) {
    console.error('Error creating audit log:', error)
    // Don't throw - audit logs should not block main operations
  }
}
