import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SessionUser } from './session'
import { supabaseServer } from './supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Cria um cliente Supabase com RLS habilitado
 * Usa a anon key para que RLS funcione
 */
export function createRLSClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Configura o contexto do usuário para RLS
 * 
 * IMPORTANTE: Esta função configura o contexto via função SQL.
 * O contexto é válido apenas para a conexão/sessão atual.
 * 
 * Para usar RLS efetivamente:
 * 1. Chame esta função antes de fazer queries
 * 2. Use createRLSClient() para fazer queries (não supabaseServer)
 * 3. O contexto será válido até a conexão ser fechada
 * 
 * Nota: Como o Supabase gerencia conexões, o contexto pode não persistir
 * entre múltiplas queries. Para garantir, você pode precisar usar
 * funções SQL que recebem user_id como parâmetro.
 */
export async function setUserContext(user: SessionUser | null): Promise<{ error: any }> {
  if (!user) {
    return { error: null }
  }

  const { error } = await supabaseServer.rpc('exec_with_user_context', {
    p_user_id: user.id,
    p_user_role: user.role,
    p_user_supplier_id: user.supplier_id || null
  })

  return { error }
}

/**
 * Função auxiliar para fazer queries com contexto de usuário
 * 
 * Esta função configura o contexto e executa a query.
 * 
 * ATENÇÃO: Devido às limitações do Supabase com autenticação customizada,
 * esta abordagem pode não funcionar perfeitamente. Considere:
 * 
 * 1. Usar service role key e implementar permissões na aplicação (mais simples)
 * 2. Criar funções SQL que recebem user_id como parâmetro (mais seguro)
 * 3. Usar esta função apenas para testes/desenvolvimento
 */
export async function queryWithRLS<T>(
  user: SessionUser | null,
  queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  if (!user) {
    const client = createRLSClient()
    return await queryFn(client)
  }

  // Configura contexto
  const { error: contextError } = await setUserContext(user)
  if (contextError) {
    console.error('Error setting user context:', contextError)
    return { data: null, error: contextError }
  }

  // Executa query com cliente que respeita RLS
  const client = createRLSClient()
  return await queryFn(client)
}

/**
 * Verifica se o usuário tem permissão específica
 * Útil para validação na aplicação antes de fazer queries
 */
export function userHasPermission(user: SessionUser | null, permission: string): boolean {
  if (!user) return false

  // Admin e dev têm todas as permissões
  if (user.role === 'admin' || user.role === 'dev') {
    return true
  }

  // Verifica permissão específica
  const permissionMap: Record<string, keyof SessionUser> = {
    'can_view_dashboard': 'can_view_dashboard',
    'can_view_map': 'can_view_map',
    'can_manage_sites': 'can_manage_sites',
    'can_manage_machines': 'can_manage_machines',
    'can_register_events': 'can_register_events',
    'can_approve_events': 'can_approve_events',
    'can_view_financial': 'can_view_financial',
    'can_manage_suppliers': 'can_manage_suppliers',
    'can_manage_users': 'can_manage_users',
    'can_view_logs': 'can_view_logs',
  }

  const permissionKey = permissionMap[permission]
  return permissionKey ? (user[permissionKey] as boolean) : false
}
