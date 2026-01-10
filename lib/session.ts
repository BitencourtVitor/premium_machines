// Session management for client-side

const SESSION_KEY = 'premium_machines_session'

export interface SessionUser {
  id: string
  nome: string
  email?: string
  role: string
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
}

export function setSessionUser(user: SessionUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }
}

export function getSessionUser(): SessionUser | null {
  if (typeof window !== 'undefined') {
    const session = localStorage.getItem(SESSION_KEY)
    if (session) {
      try {
        return JSON.parse(session)
      } catch {
        return null
      }
    }
  }
  return null
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}

export function isAuthenticated(): boolean {
  return getSessionUser() !== null
}
