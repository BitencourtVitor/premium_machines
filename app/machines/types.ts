export interface Machine {
  id: string
  unit_number: string
  machine_type: { id: string; nome: string; icon?: string }
  ownership_type: 'owned' | 'rented'
  supplier?: { id: string; nome: string }
  current_site?: { id: string; title: string }
  status: string
  ativo: boolean
  billing_type?: 'daily' | 'weekly' | 'monthly'
  daily_rate?: string
  weekly_rate?: string
  monthly_rate?: string
}

export interface MachineType {
  id: string
  nome: string
  icon?: string
  is_attachment: boolean
  created_at: string
  updated_at: string
}
