'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import BottomNavigation from '@/app/components/BottomNavigation';
import { useSidebar } from '@/lib/useSidebar';

interface DebugEvent {
  id: string
  event_type: string
  status: string
  machine?: { unit_number: string }
  site?: { title: string }
  created_at: string
  approved_at?: string
}

export default function DebugPage() {
  const [events, setEvents] = useState<DebugEvent[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const { isExpanded } = useSidebar();

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/debug/events')
      const data = await response.json()
      if (data.success) {
        setEvents(data.events)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            
            {loading ? (
                <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="md:overflow-y-auto md:flex-1 md:pr-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    🔍 Debug - Todos os Eventos do Sistema
                    </h1>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total de Eventos</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">Pendentes</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</div>
                        <div className="text-sm text-green-600 dark:text-green-400">Aprovados</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
                        <div className="text-sm text-red-600 dark:text-red-400">Rejeitados</div>
                    </div>
                    </div>

                    {/* Events List */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Lista de Eventos
                        </h2>
                    </div>

                    {events.length === 0 ? (
                        <div className="p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">Nenhum evento encontrado</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {events.map((event) => (
                            <div key={event.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                    {event.machine?.unit_number || 'Máquina não encontrada'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    event.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    event.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                    {event.status}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                    <span className="font-medium">{event.event_type}</span>
                                    {event.site && <span> • {event.site.title}</span>}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                    Criado: {new Date(event.created_at).toLocaleString('pt-BR')}
                                    {event.approved_at && (
                                    <span className="ml-4 text-green-600 dark:text-green-400">
                                        Aprovado: {new Date(event.approved_at).toLocaleString('pt-BR')}
                                    </span>
                                    )}
                                </div>
                                </div>
                                <div className="text-xs font-mono text-gray-400 dark:text-gray-500">
                                {event.id}
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}
                    </div>

                    <div className="mt-6 flex gap-4 pb-4">
                    <button
                        onClick={loadEvents}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        🔄 Atualizar Eventos
                    </button>
                    <button
                        onClick={async () => {
                        try {
                            const response = await fetch('/api/sync/all', { method: 'POST' })
                            const data = await response.json()
                            if (data.success) {
                            alert(`✅ ${data.message}`)
                            loadEvents() // Recarregar após sync
                            } else {
                            alert(`❌ Erro: ${data.message}`)
                            }
                        } catch (error) {
                            alert('❌ Erro na sincronização')
                        }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        🔄 Sincronizar Tudo
                    </button>
                    <button
                        onClick={async () => {
                        try {
                            const response = await fetch('/api/debug/allocations')
                            const data = await response.json()
                            if (data.success) {
                            console.log('🔍 Estado das alocações:', data)
                            alert(`🔍 Ver console para debug de alocações\nTotal máquinas: ${data.summary.total_machines}\nAlocações ativas: ${data.summary.active_allocations}`)
                            } else {
                            alert(`❌ Erro: ${data.message}`)
                            }
                        } catch (error) {
                            alert('❌ Erro no debug')
                        }
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        🔍 Debug Alocações
                    </button>
                    <button
                        onClick={async () => {
                        try {
                            const response = await fetch('/api/test/system')
                            const data = await response.json()
                            if (data.success) {
                            alert(`✅ ${data.message}`)
                            } else {
                            alert(`❌ ${data.message}\n\nRecomendações:\n${data.recommendations.join('\n')}`)
                            }
                            console.log('🔧 Teste do sistema:', data)
                        } catch (error) {
                            alert('❌ Erro no teste do sistema')
                        }
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                        🔧 Testar Sistema
                    </button>
                    </div>
                </div>
            )}
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}
