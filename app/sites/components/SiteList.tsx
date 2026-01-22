import React, { useState, useRef, useEffect } from 'react'
import { Site } from '../types'
import { cleanAddress } from '../utils'
import BaseList from '../../components/BaseList'
import ListActionButton from '../../components/ListActionButton'
import { MACHINE_STATUS_LABELS } from '@/lib/permissions'
import { Portal } from '@headlessui/react'

interface MachineCountProps {
  site: Site
}

function MachineCount({ site }: MachineCountProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Usar all_machines se disponível, senão fallback para machines
  const allMachines = site.all_machines || site.machines || []
  const activeMachinesIds = new Set((site.machines || []).map(m => m.id))

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.left
      })
    }
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    updateCoords()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('scroll', updateCoords, true)
      window.addEventListener('resize', updateCoords)
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [isOpen])

  return (
    <div className="relative flex flex-col items-center" ref={triggerRef}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex flex-col items-center cursor-help"
      >
        <div className="text-center hidden sm:block">
          <p className={`text-xl md:text-2xl font-bold transition-colors ${
            isOpen ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {site.machines_count || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">máquinas</p>
        </div>
        <div className="text-center sm:hidden">
          <p className={`text-lg font-bold transition-colors ${
            isOpen ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {site.machines_count || 0}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">máq</p>
        </div>

        {/* Popover Customizado com Portal para evitar clipping e sobrepor header */}
        {isOpen && allMachines.length > 0 && (
          <Portal>
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transform: 'translate(-100%, -50%)',
                zIndex: 10010, // Maior que o Header (10005)
              }}
              className="mr-2 animate-in fade-in slide-in-from-right-2 duration-200"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-64 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Histórico de Máquinas
                  </span>
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {allMachines.length}
                  </span>
                </div>

                <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
                  <div className="space-y-1">
                    {allMachines.map((machine: any) => {
                      const isActive = activeMachinesIds.has(machine.id)
                      return (
                        <div 
                          key={machine.id} 
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm ${
                            isActive 
                              ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-900/30' 
                              : 'bg-gray-50/50 dark:bg-gray-700/30 border-transparent opacity-70'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {machine.unit_number}
                            </span>
                            {!isActive && (
                              <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-none">
                                Anterior
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            machine.status === 'maintenance' 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                            : machine.status === 'exceeded'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                            : machine.status === 'moved'
                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-200 dark:border-pink-800'
                            : machine.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : machine.status === 'in_transit'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          }`}>
                            {MACHINE_STATUS_LABELS[machine.status] || machine.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-white dark:bg-gray-800 border-r border-t border-gray-100 dark:border-gray-700 rotate-45" />
            </div>
          </Portal>
        )}
      </div>
    </div>
  )
}

interface SiteListProps {
  sites: Site[]
  loadingSites: boolean
  showArchivedSites: boolean
  setShowArchivedSites: (show: boolean) => void
  handleRefresh: () => void
  handleOpenModal: (site?: Site) => void
  handleArchiveSite: (site: Site) => void
}

export default function SiteList({
  sites,
  loadingSites,
  showArchivedSites,
  setShowArchivedSites,
  handleRefresh,
  handleOpenModal,
  handleArchiveSite,
}: SiteListProps) {


  return (
    <BaseList
      title="Jobsites"
      items={sites}
      loading={loadingSites}
      showSearch={true}
      searchFields={['title', 'address', 'city', 'state']}
      searchPlaceholder="Buscar jobsites..."
      showRefresh={true}
      onRefresh={handleRefresh}
      showArchive={true}
      onArchive={() => setShowArchivedSites(!showArchivedSites)}
      isArchivedView={showArchivedSites}
      showAdd={!showArchivedSites}
      onAdd={() => handleOpenModal()}
      renderItem={(site) => (
        <div className="relative p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-0 hover:z-[10]">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{site.title}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                {cleanAddress(site.address)}
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <MachineCount site={site} />
              <ListActionButton
                icon="edit"
                onClick={() => handleOpenModal(site)}
                variant="blue"
                title="Editar"
                className="p-1.5 md:p-2"
              />
              <ListActionButton
                icon={site.ativo ? "archive" : "unarchive"}
                onClick={() => handleArchiveSite(site)}
                variant={site.ativo ? "orange" : "green"}
                title={site.ativo ? "Arquivar" : "Desarquivar"}
                className="p-1.5 md:p-2"
              />
            </div>
          </div>
        </div>
      )}
    />
  )
}
