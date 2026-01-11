import React from 'react'
import CustomDropdown from '../../components/CustomDropdown'
import { NewEventState, ActiveDowntime } from '../types'
import { EVENT_TYPE_LABELS, DOWNTIME_REASON_LABELS } from '@/lib/permissions'

interface CreateEventModalProps {
  showCreateModal: boolean
  setShowCreateModal: (show: boolean) => void
  newEvent: NewEventState
  setNewEvent: (event: NewEventState) => void
  machines: any[]
  sites: any[]
  activeDowntimes: ActiveDowntime[]
  creating: boolean
  handleCreateEvent: () => void
}

export default function CreateEventModal({
  showCreateModal,
  setShowCreateModal,
  newEvent,
  setNewEvent,
  machines,
  sites,
  activeDowntimes,
  creating,
  handleCreateEvent
}: CreateEventModalProps) {
  if (!showCreateModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {newEvent.event_type === 'request_allocation' ? 'Solicitar Alocação' :
             newEvent.event_type === 'confirm_allocation' ? 'Confirmar Alocação' :
             'Novo Evento'}
          </h2>
          <button
            onClick={() => setShowCreateModal(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <CustomDropdown
            label="Tipo de Evento *"
            value={newEvent.event_type}
            onChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
            options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
              value,
              label: label as string
            }))}
            placeholder="Selecione o tipo de evento"
            required
          />

          <CustomDropdown
            label="Máquina *"
            value={newEvent.machine_id}
            onChange={(value) => setNewEvent({ ...newEvent, machine_id: value })}
            options={[
              { value: '', label: 'Selecione...' },
              ...machines.map((machine) => ({
                value: machine.id,
                label: `${machine.unit_number} - ${machine.machine_type?.nome}`
              }))
            ]}
            placeholder="Selecione uma máquina"
            required
          />

          {['request_allocation', 'confirm_allocation', 'start_allocation', 'end_allocation'].includes(newEvent.event_type) && (
            <>
              <CustomDropdown
                label="Jobsite *"
                value={newEvent.site_id}
                onChange={(value) => setNewEvent({ ...newEvent, site_id: value })}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...sites.map((site) => ({
                    value: site.id,
                    label: site.title
                  }))
                ]}
                placeholder="Selecione um jobsite"
                required
              />

              <CustomDropdown
                label="Tipo de Construção"
                value={newEvent.construction_type || ''}
                onChange={(value) => setNewEvent({ ...newEvent, construction_type: value || '' })}
                options={[
                  { value: '', label: 'Selecione...' },
                  { value: 'lot', label: 'Lote' },
                  { value: 'building', label: 'Prédio/Edifício' }
                ]}
                placeholder="Selecione o tipo de construção"
              />

              {newEvent.construction_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número do {newEvent.construction_type === 'lot' ? 'Lote' : 'Prédio'}
                  </label>
                  <input
                    type="text"
                    value={newEvent.lot_building_number}
                    onChange={(e) => setNewEvent({ ...newEvent, lot_building_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={`Número do ${newEvent.construction_type === 'lot' ? 'lote' : 'prédio'}`}
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data/Hora do Evento *
            </label>
            <input
              type="datetime-local"
              value={newEvent.event_date}
              onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {['downtime_start'].includes(newEvent.event_type) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo da Parada *
                </label>
                <CustomDropdown
                  value={newEvent.downtime_reason || ''}
                  onChange={(value) => setNewEvent({ ...newEvent, downtime_reason: value || '' })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...Object.entries(DOWNTIME_REASON_LABELS).map(([value, label]) => ({
                      value,
                      label: label as string
                    }))
                  ]}
                  placeholder="Selecione o motivo da parada"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={newEvent.downtime_description}
                  onChange={(e) => setNewEvent({ ...newEvent, downtime_description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descreva o motivo da parada..."
                />
              </div>
            </>
          )}

          {['downtime_end'].includes(newEvent.event_type) && (
            <>
              <CustomDropdown
                label="Máquina *"
                value={newEvent.machine_id}
                onChange={(value) => setNewEvent({ ...newEvent, machine_id: value })}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...machines.map((machine) => ({
                    value: machine.id,
                    label: `${machine.unit_number} - ${machine.machine_type?.nome}`
                  }))
                ]}
                placeholder="Selecione uma máquina"
                required
              />

              <CustomDropdown
                label="Downtime Ativo *"
                value={newEvent.corrects_event_id}
                onChange={(value) => {
                  const selectedDowntime = activeDowntimes.find(d => d.downtime_event_id === value)
                  setNewEvent({
                    ...newEvent,
                    corrects_event_id: value,
                    machine_id: selectedDowntime?.machine_id || '',
                    site_id: selectedDowntime?.site_id || '',
                  })
                }}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...activeDowntimes.map((downtime) => ({
                    value: downtime.downtime_event_id,
                    label: `${downtime.machine_unit_number} - ${downtime.downtime_reason} (${new Date(downtime.downtime_start).toLocaleDateString('pt-BR')})`
                  }))
                ]}
                placeholder="Selecione o downtime a ser finalizado"
                required
              />

              {newEvent.machine_id && newEvent.corrects_event_id && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Finalizando downtime da máquina <span className="font-bold">{machines.find(m => m.id === newEvent.machine_id)?.unit_number}</span>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Site: {sites.find(s => s.id === newEvent.site_id)?.title || 'Não identificado'}
                  </p>
                </div>
              )}

              {activeDowntimes.length === 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    ⚠️ Nenhum downtime ativo encontrado
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    Primeiro registre um evento de &quot;Início de Downtime&quot; antes de tentar finalizar.
                  </p>
                </div>
              )}
            </>
          )}

          {['extension_attach', 'extension_detach'].includes(newEvent.event_type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Extensão *
              </label>
              <input
                type="text"
                value={newEvent.extension_id}
                onChange={(e) => setNewEvent({ ...newEvent, extension_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="ID da extensão (UUID)"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Informe o ID (UUID) da extensão. Em breve, haverá um seletor aqui.
              </p>
            </div>
          )}

          {['correction'].includes(newEvent.event_type) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID do Evento a Corrigir *
                </label>
                <input
                  type="text"
                  value={newEvent.corrects_event_id}
                  onChange={(e) => setNewEvent({ ...newEvent, corrects_event_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Cole o ID do evento a ser corrigido"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição da Correção *
                </label>
                <textarea
                  value={newEvent.correction_description}
                  onChange={(e) => setNewEvent({ ...newEvent, correction_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descreva a correção que está sendo aplicada..."
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={newEvent.notas}
              onChange={(e) => setNewEvent({ ...newEvent, notas: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Observações adicionais..."
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowCreateModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateEvent}
            disabled={creating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Criando...' : 'Criar Evento'}
          </button>
        </div>
      </div>
    </div>
  )
}
