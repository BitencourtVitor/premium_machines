import React, { useState } from 'react'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { Site } from '../types'
import { cleanAddress } from '../utils'
import BaseList from '../../components/BaseList'
import ListActionButton from '../../components/ListActionButton'
import { MACHINE_STATUS_LABELS } from '@/lib/permissions'

interface MachineCountProps {
  site: Site
}

function MachineCount({ site }: MachineCountProps) {
  const [isOpen, setIsOpen] = useState(false)
  const machines = site.machines || []

  return (
    <Popover className="relative flex flex-col items-center">
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex flex-col items-center"
      >
        <PopoverButton className="focus:outline-none group cursor-help">
          <div className="text-center hidden sm:block">
            <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              {site.machines_count || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">máquinas</p>
          </div>
          <div className="text-center sm:hidden">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              {site.machines_count || 0}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">máq</p>
          </div>
        </PopoverButton>

        <Transition
          show={isOpen && machines.length > 0}
          as={React.Fragment}
          enter="transition duration-200 ease-out"
          enterFrom="opacity-0 scale-95 translate-x-2"
          enterTo="opacity-100 scale-100 translate-x-0"
          leave="transition duration-150 ease-in"
          leaveFrom="opacity-100 scale-100 translate-x-0"
          leaveTo="opacity-0 scale-95 translate-x-2"
        >
          <PopoverPanel
            static
            anchor={{ to: 'left', gap: 16 }}
            className="z-[9999] w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-3 focus:outline-none !overflow-visible"
          >
            <div className="flex items-center justify-between mb-3 border-b border-gray-50 dark:border-gray-700 pb-2">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Máquinas Alocadas</h4>
              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {machines.length}
              </span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {machines.map((machine: any) => (
                <div 
                  key={machine.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {machine.unit_number}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    machine.status === 'maintenance' 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                      : machine.status === 'allocated'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {MACHINE_STATUS_LABELS[machine.status] || machine.status}
                  </span>
                </div>
              ))}
            </div>
            {/* Arrow */}
            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-r border-t border-gray-100 dark:border-gray-700 rotate-45" />
          </PopoverPanel>
        </Transition>
      </div>
    </Popover>
  )
}

interface SiteListProps {
  sites: Site[]
  loadingSites: boolean
  showArchivedSites: boolean
  setShowArchivedSites: (show: boolean) => void
  loadSites: () => void
  handleOpenModal: (site?: Site) => void
  handleArchiveSite: (site: Site) => void
}

export default function SiteList({
  sites,
  loadingSites,
  showArchivedSites,
  setShowArchivedSites,
  loadSites,
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
      onRefresh={loadSites}
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
