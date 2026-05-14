'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiMail, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiRefreshCw } from 'react-icons/fi'

interface Recipient {
  id: string
  email: string
  nome: string
  lista: 'geral' | 'manutencao_corretiva'
  active: boolean
  created_at: string
}

interface RecipientFormData {
  email: string
  nome: string
}

function RecipientForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: RecipientFormData
  onSave: (data: RecipientFormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<RecipientFormData>(initial ?? { email: '', nome: '' })

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
      <input
        type="text"
        placeholder="Nome"
        value={form.nome}
        onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      <input
        type="email"
        placeholder="E-mail"
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
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
          disabled={saving || !form.nome.trim() || !form.email.trim()}
          onClick={() => onSave(form)}
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
  recipients,
  loading,
  onReload,
}: {
  lista: 'geral' | 'manutencao_corretiva'
  title: string
  recipients: Recipient[]
  loading: boolean
  onReload: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async (form: RecipientFormData) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/email-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lista }),
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

  const handleEdit = async (id: string, form: RecipientFormData) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/email-recipients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiMail className="text-blue-500" />
          <span className="font-semibold text-gray-800 dark:text-gray-100">{title}</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {recipients.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
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
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FiPlus className="w-3 h-3" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Add form */}
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

      {/* List */}
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
                initial={{ email: r.email, nome: r.nome }}
                onSave={form => handleEdit(r.id, form)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${r.active ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/50 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.email}</p>
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Gerencie quem recebe notificações automáticas de eventos registrados no sistema.
        </p>
      </div>
      <div className="flex-1 p-4 md:overflow-auto">
        <div className="flex flex-col md:flex-row gap-6">
          <RecipientList
            lista="geral"
            title="Lista Geral"
            recipients={geralRecipients}
            loading={loadingGeral}
            onReload={loadGeral}
          />
          <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <RecipientList
            lista="manutencao_corretiva"
            title="Manutenção Corretiva"
            recipients={manutencaoRecipients}
            loading={loadingManutencao}
            onReload={loadManutencao}
          />
        </div>
      </div>
    </div>
  )
}
