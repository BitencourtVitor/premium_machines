// Utilitário para determinar a página inicial do usuário baseado em suas permissões
// Ordem de prioridade: Mapa > Dashboard > Outras telas

import { SessionUser } from './session'

/**
 * Determina a página inicial que o usuário deve ver após o login
 * baseado em suas permissões, seguindo a ordem de prioridade:
 * 1. Mapa (primeira prioridade)
 * 2. Dashboard (segunda prioridade)
 * 3. Outras telas (terceira prioridade em diante)
 * 
 * @param user - Objeto do usuário com permissões
 * @returns Caminho da página inicial
 */
export function getHomePageForUser(user: SessionUser | null): string {
  if (!user) {
    return '/login'
  }
  
  // Fornecedor sempre vai para o mapa (prioridade absoluta)
  if (user.role === 'fornecedor') {
    return '/map'
  }
  
  // Ordem de prioridade das páginas baseada nas permissões
  // 1. Mapa (primeira prioridade)
  if (user.can_view_map) {
    return '/map'
  }
  
  // 2. Dashboard (segunda prioridade)
  // Admin e dev sempre têm acesso implícito ao dashboard
  if (user.can_view_dashboard || user.role === 'admin' || user.role === 'dev') {
    return '/dashboard'
  }
  
  // 3. Outras telas (terceira prioridade em diante)
  // Sites (Obras)
  if (user.can_manage_sites) {
    return '/sites'
  }
  
  // Máquinas
  if (user.can_manage_machines) {
    return '/machines'
  }
  
  // Eventos (Alocações)
  if (user.can_register_events || user.can_approve_events) {
    return '/events'
  }
  
  // Relatórios Financeiros
  if (user.can_view_financial) {
    return '/reports'
  }
  
  // Usuários
  if (user.can_manage_users) {
    return '/usuarios'
  }
  
  // Logs
  if (user.can_view_logs) {
    return '/logs'
  }
  
  // Fallback: mapa (página mais básica e acessível)
  return '/map'
}
