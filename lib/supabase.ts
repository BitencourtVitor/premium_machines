import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for the database
export interface User {
  id: string
  nome: string
  email?: string
  role: 'admin' | 'dev' | 'operador' | 'fornecedor'
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
  supplier_id?: string
  validado: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  nome: string
  email?: string
  telefone?: string
  supplier_type: 'rental' | 'maintenance' | 'both' | 'fuel'
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  title: string
  address: string
  latitude: number
  longitude: number
  geocoding_confidence?: number
  place_type?: string
  city?: string
  state?: string
  country: string
  ativo: boolean
  notas?: string
  created_at: string
  updated_at: string
}

export interface MachineType {
  id: string
  nome: string
  descricao?: string
  icon?: string
  created_at: string
  is_attachment?: boolean
}

export interface Machine {
  id: string
  unit_number: string
  machine_type_id: string
  ownership_type: 'owned' | 'rented'
  supplier_id?: string
  billing_type?: 'daily' | 'weekly' | 'monthly'
  daily_rate?: number
  weekly_rate?: number
  monthly_rate?: number
  current_site_id?: string
  status: 'available' | 'allocated' | 'maintenance' | 'inactive'
  notas?: string
  ativo: boolean
  created_at: string
  updated_at: string
  // Joined fields
  machine_type?: MachineType
  supplier?: Supplier
  current_site?: Site
}

export interface ExtensionType {
  id: string
  nome: string
  descricao?: string
  compatible_machine_types: string[]
  created_at: string
  updated_at: string
}

export interface MachineExtension {
  id: string
  unit_number: string
  extension_type_id: string
  ownership_type: 'owned' | 'rented'
  supplier_id?: string
  billing_type?: 'daily' | 'weekly' | 'monthly'
  daily_rate?: number
  weekly_rate?: number
  monthly_rate?: number
  current_machine_id?: string
  status: 'available' | 'attached' | 'maintenance' | 'inactive'
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface AllocationEvent {
  id: string
  event_type: 'start_allocation' | 'end_allocation' | 'downtime_start' | 'downtime_end' | 'correction' | 'extension_attach' | 'extension_detach'
  machine_id: string
  site_id?: string
  extension_id?: string
  event_date: string
  end_date?: string
  downtime_reason?: 'defect' | 'lack_of_supplies' | 'weather' | 'lack_of_operator' | 'holiday' | 'maintenance' | 'other'
  downtime_description?: string
  supplier_id?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  corrects_event_id?: string
  correction_description?: string
  created_by: string
  notas?: string
  created_at: string
  updated_at: string
  // Joined fields
  machine?: Machine
  site?: Site
  supplier?: Supplier
  created_by_user?: User
  approved_by_user?: User
}

export interface FinancialSnapshot {
  id: string
  site_id?: string
  machine_id: string
  supplier_id?: string
  extension_id?: string
  period_start: string
  period_end: string
  total_days: number
  downtime_days: number
  billable_days: number
  daily_rate?: number
  estimated_cost: number
  calculated_at: string
  created_at: string
}
