'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiMail, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiRefreshCw, FiInfo } from 'react-icons/fi'

interface Recipient {
  id: string
  email: string
  lista: 'geral' | 'manutencao_corretiva'
  active: boolean
  created_at: string
}

function RecipientForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: string
  onSave: (email: string) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [email, setEmail] = useState(initial ?? '')

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
      <input
        type="email"
        placeholder="email@dominio.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && email.trim() && !saving) {
            onSave(email)
          }
        }}
        autoFocus
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
        >
          Cancelar
        </button>
        <button
          disabled={saving || !email.trim()}
          onClick={() => onSave(email)}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function RecipientList({
  lista,
  title,
  description,
  recipients,
  loading,
  onReload,
}: {
  lista: 'geral' | 'manutencao_corretiva'
  title: string
  description: string
  recipients: Recipient[]
  loading: boolean
  onReload: () => void
}) {
  const isBackcharge = lista === 'manutencao_corretiva'
  const theme = isBackcharge
    ? {
        icon: 'text-amber-500',
        accent: 'border-l-amber-400 dark:border-l-amber-500/70',
        bgTint: 'bg-amber-50/30 dark:bg-amber-900/5',
        badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
        button: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20',
      }
    : {
        icon: 'text-blue-500',
        accent: 'border-l-blue-400 dark:border-l-blue-500/70',
        bgTint: 'bg-blue-50/30 dark:bg-blue-900/5',
        badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        button: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20',
      }
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async (email: string) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/email-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lista }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setAdding(false)
      onReload()
    } catch (e: any) {
      setError(e.message || 'Erro ao adicionar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string, email: string) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/email-recipients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setEditingId(null)
      onReload()
    } catch (e: any) {
      setError(e.message || 'Erro ao editar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (r: Recipient) => {
    try {
      await fetch(`/api/email-recipients/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !r.active }),
      })
      onReload()
    } catch {
      // silent
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este destinatário?')) return
    try {
      await fetch(`/api/email-recipients/${id}`, { method: 'DELETE' })
      onReload()
    } catch {
      // silent
    }
  }

  return (
    <div className={`flex flex-col gap-3 flex-1 min-w-0 rounded-lg border-l-4 ${theme.accent} ${theme.bgTint} pl-3 py-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <FiMail className={`${theme.icon} flex-shrink-0`} />
            <span className="font-semibold text-gray-800 dark:text-gray-100">{title}</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${theme.badge}`}>
              {recipients.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onReload}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Recarregar"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setAdding(true); setEditingId(null) }}
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors ${theme.button}`}
          >
            <FiPlus className="w-3 h-3" />
            Adicionar
          </button>
        </div>
      </div>

      {adding && (
        <RecipientForm
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex flex-col gap-1">
        {loading && recipients.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-400">Carregando...</div>
        )}
        {!loading && recipients.length === 0 && !adding && (
          <div className="py-6 text-center text-sm text-gray-400">Nenhum destinatário cadastrado</div>
        )}
        {recipients.map(r => (
          <div key={r.id}>
            {editingId === r.id ? (
              <RecipientForm
                initial={r.email}
                onSave={email => handleEdit(r.id, email)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${r.active ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/50 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.email}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(r)}
                    title={r.active ? 'Desativar' : 'Ativar'}
                    className={`p-1.5 rounded transition-colors ${r.active ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-green-500'}`}
                  >
                    {r.active ? <FiToggleRight className="w-4 h-4" /> : <FiToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setEditingId(r.id); setAdding(false) }}
                    title="Editar"
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    title="Remover"
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EmailRecipientsTab() {
  const [geralRecipients, setGeralRecipients] = useState<Recipient[]>([])
  const [manutencaoRecipients, setManutencaoRecipients] = useState<Recipient[]>([])
  const [loadingGeral, setLoadingGeral] = useState(true)
  const [loadingManutencao, setLoadingManutencao] = useState(true)

  const loadGeral = useCallback(async () => {
    setLoadingGeral(true)
    try {
      const res = await fetch('/api/email-recipients?lista=geral')
      const json = await res.json()
      if (json.success) setGeralRecipients(json.recipients)
    } finally {
      setLoadingGeral(false)
    }
  }, [])

  const loadManutencao = useCallback(async () => {
    setLoadingManutencao(true)
    try {
      const res = await fetch('/api/email-recipients?lista=manutencao_corretiva')
      const json = await res.json()
      if (json.success) setManutencaoRecipients(json.recipients)
    } finally {
      setLoadingManutencao(false)
    }
  }, [])

  useEffect(() => {
    loadGeral()
    loadManutencao()
  }, [loadGeral, loadManutencao])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 md:overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Destinatários de E-mail</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          A cada novo evento registrado, o sistema dispara um e-mail automático via SMTP do Google para os destinatários cadastrados aqui.
        </p>
        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
          <FiInfo className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            A <strong>Lista de Backcharge</strong> é <strong>adicional</strong> à Lista Geral: quando uma manutenção corretiva com backcharge é registrada, o e-mail também é enviado para essa lista (sem duplicar quem já está na Lista Geral).
          </p>
        </div>
      </div>
      <div className="flex-1 p-4 md:overflow-auto">
        <div className="flex flex-col md:flex-row gap-6">
          <RecipientList
            lista="geral"
            title="Lista Geral"
            description="Recebe e-mail de todo evento registrado no sistema (início/fim de alocação, transporte, manutenção, etc.)."
            recipients={geralRecipients}
            loading={loadingGeral}
            onReload={loadGeral}
          />
          <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <RecipientList
            lista="manutencao_corretiva"
            title="Lista de Backcharge"
            description="Recebe e-mail adicional apenas quando o evento é uma manutenção corretiva com backcharge para subcontratado."
            recipients={manutencaoRecipients}
            loading={loadingManutencao}
            onReload={loadManutencao}
          />
        </div>
      </div>
    </div>
  )
}
