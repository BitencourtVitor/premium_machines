// Permission configuration for roles

export interface RolePermissions {
  can_view_dashboard: boolean
  can_view_map: boolean
  can_manage_sites: boolean
  can_manage_machines: boolean
  can_register_events: boolean
  can_approve_events: boolean
  can_view_financial: boolean
  can_manage_suppliers: boolean
  can_manage_users: boolean
  can_view_logs: boolean
}

export const DEFAULT_PERMISSIONS: Record<string, RolePermissions> = {
  admin: {
    can_view_dashboard: true,
    can_view_map: true,
    can_manage_sites: true,
    can_manage_machines: true,
    can_register_events: true,
    can_approve_events: true,
    can_view_financial: true,
    can_manage_suppliers: true,
    can_manage_users: true,
    can_view_logs: true,
  },
  dev: {
    can_view_dashboard: true,
    can_view_map: true,
    can_manage_sites: true,
    can_manage_machines: true,
    can_register_events: true,
    can_approve_events: true,
    can_view_financial: true,
    can_manage_suppliers: true,
    can_manage_users: true,
    can_view_logs: true,
  },
  operador: {
    can_view_dashboard: true,
    can_view_map: true,
    can_manage_sites: false,
    can_manage_machines: true,
    can_register_events: true,
    can_approve_events: false,
    can_view_financial: false,
    can_manage_suppliers: false,
    can_manage_users: false,
    can_view_logs: false,
  },
  fornecedor: {
    can_view_dashboard: true,
    can_view_map: true,
    can_manage_sites: false,
    can_manage_machines: false, // Can only view their own machines
    can_register_events: false,
    can_approve_events: false,
    can_view_financial: false, // Limited to their own data
    can_manage_suppliers: false,
    can_manage_users: false,
    can_view_logs: false,
  },
}

export function getDefaultPermissions(role: string): RolePermissions {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.operador
}

// Event types labels
export const EVENT_TYPE_LABELS: Record<string, string> = {
  request_allocation: 'Solicitação de Alocação',
  start_allocation: 'Alocação de Máquina',
  end_allocation: 'Fim de Alocação',
  downtime_start: 'Início de Manutenção',
  downtime_end: 'Fim de Manutenção',
  extension_attach: 'Alocação de Extensão',
  refueling: 'Abastecimento',
  transport_start: 'Início de Transporte',
  transport_arrival: 'Chegada em Obra',
}

// Downtime reason labels
export const DOWNTIME_REASON_LABELS: Record<string, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  maintenance: 'Preventiva',
  defect: 'Corretiva',
}

// Machine status labels
export const MACHINE_STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  allocated: 'Alocada',
  maintenance: 'Em Manutenção',
  inactive: 'Inativa',
  in_transit: 'Em Trânsito',
  exceeded: 'Ativa Excedida',
  moved: 'Movida',
  scheduled: 'Agendada',
  finished: 'Encerrada',
  active: 'Ativa',
}

// Event status labels
export const EVENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

// Billing type labels
export const BILLING_TYPE_LABELS: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

// Ownership type labels
export const OWNERSHIP_TYPE_LABELS: Record<string, string> = {
  owned: 'Própria',
  rented: 'Alugada',
}

/**
 * Retorna o label amigável para o status da máquina, considerando o tipo de propriedade.
 * Caso a máquina seja alugada e esteja disponível, o status exibido será "Devolvida".
 */
export function getMachineStatusLabel(status: string, ownershipType?: string): string {
  if (status === 'available' && ownershipType === 'rented') {
    return 'Devolvida'
  }
  return MACHINE_STATUS_LABELS[status] || status
}
