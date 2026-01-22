'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { HiOutlineArrowPath, HiOutlinePlus, HiOutlineMagnifyingGlass, HiChevronLeft, HiChevronRight, HiOutlineCalendarDays, HiXMark } from 'react-icons/hi2'
import { FiFilter, FiDownload, FiArchive } from 'react-icons/fi'
import { LuFilterX } from 'react-icons/lu'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'

export type ListIntervalType = 'daily' | 'weekly' | 'bimonthly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom'

interface BaseListProps<T> {
  title: string
  items: T[]
  totalCount?: number
  loading?: boolean
  emptyMessage?: string
  emptyConfig?: {
    icon?: React.ReactNode
    title?: string
    description?: string
  }
  renderItem: (item: T) => React.ReactNode
  
  // Search
  showSearch?: boolean
  searchTerm?: string
  onSearchChange?: (term: string) => void
  searchPlaceholder?: string
  searchFields?: string[] // e.g. ['machine.unit_number', 'site.title']
  
  // Filter
  showFilter?: boolean
  isFiltering?: boolean
  onFilterToggle?: () => void
  showFilterPanel?: boolean // Keep for backward compatibility or internal state
  filterPanelContent?: React.ReactNode
  onClearFilters?: () => void
  filterRef?: React.RefObject<HTMLDivElement>
  filterConfig?: {
    popoverWidth?: string
    popoverPlacement?: any // Headless UI anchor type
    showArrow?: boolean
    title?: string
  }
  
  // Actions
  showRefresh?: boolean
  onRefresh?: () => void
  
  showAdd?: boolean
  onAdd?: () => void
  
  showDownload?: boolean
  onDownload?: () => void
  
  showArchive?: boolean
  onArchive?: () => void

  // Calendar Controls
  showCalendarControls?: boolean
  calendarConfig?: {
    onPrev: () => void
    onNext: () => void
    onToday: () => void
    currentLabel: string
    intervalType: ListIntervalType
    offset?: number
    showDateRange?: boolean
  }

  // Super Button
  showSuperButton?: boolean
  superButtonConfig?: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    borderColor?: string // e.g. 'border-blue-600'
    textColor?: string   // e.g. 'text-blue-600'
    hoverBg?: string    // e.g. 'hover:bg-blue-50'
  }
  
  // State
  isArchivedView?: boolean
}

export default function BaseList<T>({
  title,
  items,
  totalCount,
  loading = false,
  emptyMessage = 'Nenhum item encontrado.',
  emptyConfig,
  renderItem,
  
  showSearch = false,
  searchTerm: externalSearchTerm,
  onSearchChange: externalOnSearchChange,
  searchPlaceholder = 'Pesquisar...',
  searchFields = [],
  
  showFilter = false,
  isFiltering = false,
  onFilterToggle,
  showFilterPanel = false,
  filterPanelContent,
  onClearFilters,
  filterRef,
  filterConfig,
  
  showRefresh = false,
  onRefresh,
  
  showAdd = false,
  onAdd,
  
  showDownload = false,
  onDownload,
  
  showArchive = false,
  onArchive,

  showCalendarControls = false,
  calendarConfig,

  showSuperButton = false,
  superButtonConfig,
  
  isArchivedView = false
}: BaseListProps<T>) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [internalSearchTerm, setInternalSearchTerm] = useState('')
  const searchContainerRef = useRef<HTMLDivElement>(null)
  
  // Use either the external searchTerm/onSearchChange or the internal state
  const currentSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm
  const handleSearchChange = (value: string) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(value)
    } else {
      setInternalSearchTerm(value)
    }
  }

  // Handle click outside to close search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        if (!currentSearchTerm) {
          setIsSearchExpanded(false)
        }
      }
    }

    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchExpanded, currentSearchTerm])

  const filteredItems = useMemo(() => {
    if (!currentSearchTerm || searchFields.length === 0) return items
    
    const searchLower = currentSearchTerm.toLowerCase()
    return items.filter((item) => 
      searchFields.some((field) => {
        const value = field.split('.').reduce((obj, key) => (obj as any)?.[key], item)
        return String(value || '').toLowerCase().includes(searchLower)
      })
    )
  }, [items, currentSearchTerm, searchFields])
  
  const getIntervalLabel = (type: ListIntervalType) => {
    switch (type) {
      case 'daily': return 'd'
      case 'weekly': return 'sem'
      case 'monthly': return 'm'
      case 'bimonthly': return 'bim'
      case 'quarterly': return 'tri'
      case 'semiannual': return 'semest'
      case 'yearly': return 'a'
      default: return 'un'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="relative border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-20 min-h-[73px] flex items-center px-4">
        <div className="w-full flex items-center justify-between gap-4">
          {/* Title and Calendar Info (Left Side) */}
          <div className="flex items-center gap-2 overflow-hidden flex-shrink-0">
            <h2 className="text-base font-normal text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {title} {totalCount !== undefined && !loading && ` • ${totalCount}`}
            </h2>
            
            {showCalendarControls && calendarConfig?.showDateRange && (
              <>
                <span className="hidden md:block text-gray-300 dark:text-gray-600">|</span>
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 overflow-hidden">
                  <HiOutlineCalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate tracking-tight">
                    {calendarConfig.currentLabel}
                  </span>
                  {calendarConfig.offset !== undefined && calendarConfig.offset !== 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-md">
                      {calendarConfig.offset > 0 
                        ? `+${calendarConfig.offset} ${getIntervalLabel(calendarConfig.intervalType)}` 
                        : `${calendarConfig.offset} ${getIntervalLabel(calendarConfig.intervalType)}`
                      }
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Actions (Right Side) */}
          <div className="flex items-center gap-2 ml-auto" ref={searchContainerRef}>
            {/* Search Input */}
            {showSearch && (
              <div 
                className={`
                  relative flex items-center transition-all duration-300 ease-in-out
                  ${isSearchExpanded ? 'w-48 md:w-64' : 'w-10'}
                `}
              >
                <div 
                  onClick={() => !isSearchExpanded && setIsSearchExpanded(true)}
                  className={`
                    flex items-center w-full transition-all duration-300 rounded-lg
                    ${isSearchExpanded 
                      ? 'px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-blue-500 ring-2 ring-blue-500/10 cursor-text' 
                      : 'p-2 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                    }
                  `}
                >
                  <HiOutlineMagnifyingGlass 
                    className={`
                      w-5 h-5 flex-shrink-0 transition-colors duration-300 stroke-[2.5]
                      ${isSearchExpanded ? 'text-blue-600 dark:text-blue-400' : 'text-blue-600 dark:text-white'}
                    `} 
                  />
                  
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={currentSearchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => {
                      if (!currentSearchTerm) setIsSearchExpanded(false)
                    }}
                    className={`
                      bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 text-sm p-0 ml-2
                      transition-all duration-300 w-full placeholder-gray-400 cursor-text
                      text-black dark:text-white
                      ${isSearchExpanded ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}
                    `}
                    autoFocus={isSearchExpanded}
                  />

                  {isSearchExpanded && currentSearchTerm && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSearchChange('')
                      }}
                      className="ml-1 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
                    >
                      <HiXMark className="w-4 h-4 stroke-[1.5]" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Other Actions - Only show if search is NOT expanded on mobile or always on desktop */}
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${isSearchExpanded ? 'hidden md:flex' : 'flex'}`}>
              {/* Calendar Navigation */}
              {showCalendarControls && calendarConfig && (
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
                  <button
                    onClick={calendarConfig.onPrev}
                    className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all text-gray-600 dark:text-gray-400 hover:shadow-sm"
                    title="Anterior"
                  >
                    <HiChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={calendarConfig.onToday}
                    className={`
                      px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider
                      ${calendarConfig.offset === 0 
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                      }
                    `}
                  >
                    Hoje
                  </button>

                  <button
                    onClick={calendarConfig.onNext}
                    className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all text-gray-600 dark:text-gray-400 hover:shadow-sm"
                    title="Próximo"
                  >
                    <HiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Super Button */}
              {showSuperButton && superButtonConfig && (
                <button
                  onClick={superButtonConfig.onClick}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl shadow-sm transition-all bg-white dark:bg-transparent font-medium ${superButtonConfig.borderColor || 'border-blue-600'} ${superButtonConfig.textColor || 'text-blue-600'} ${superButtonConfig.hoverBg || 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                  title={superButtonConfig.label}
                >
                  {superButtonConfig.icon}
                  <span className="hidden sm:inline">{superButtonConfig.label}</span>
                </button>
              )}

              {/* Filter Button */}
              {showFilter && (
                <Popover className="relative" ref={filterRef}>
                  <PopoverButton
                    className={({ open }) => `p-2 rounded-lg transition-colors focus:outline-none ${
                      open || isFiltering
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-blue-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Filtrar"
                  >
                    <FiFilter className="w-5 h-5" />
                  </PopoverButton>

                  <Transition
                    as={React.Fragment}
                    enter="transition duration-200 ease-out"
                    enterFrom="scale-95 opacity-0"
                    enterTo="scale-100 opacity-100"
                    leave="transition duration-150 ease-in"
                    leaveFrom="scale-100 opacity-100"
                    leaveTo="scale-95 opacity-0"
                  >
                    <PopoverPanel
                      anchor={filterConfig?.popoverPlacement || { to: 'bottom end', gap: 8 }}
                      className={`z-[100] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 ${filterConfig?.popoverWidth || 'w-72'}`}
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {filterConfig?.title || 'Filtros'}
                        </h3>
                        {isFiltering && (
                          <button
                            onClick={onClearFilters}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Limpar Filtros"
                          >
                            <LuFilterX className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        {filterPanelContent}
                      </div>
                      {filterConfig?.showArrow && (
                        <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45 z-[-1]" />
                      )}
                    </PopoverPanel>
                  </Transition>
                </Popover>
              )}

              {/* Refresh Button */}
              {showRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Atualizar"
                  disabled={loading}
                >
                  <HiOutlineArrowPath className={`w-5 h-5 stroke-[2.5] ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* Archive Button */}
              {showArchive && (
                <button
                  onClick={onArchive}
                  className={`p-2 rounded-lg transition-colors ${
                    isArchivedView
                      ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
                      : 'text-blue-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={isArchivedView ? "Ver Ativos" : "Ver Arquivados"}
                >
                  <FiArchive className="w-5 h-5" />
                </button>
              )}

              {/* Download Button */}
              {showDownload && (
                <button
                  onClick={onDownload}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Download"
                >
                  <FiDownload className="w-5 h-5" />
                </button>
              )}

              {/* Add Button */}
              {showAdd && (
                <button
                  onClick={onAdd}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Adicionar"
                >
                  <HiOutlinePlus className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center">
            {currentSearchTerm ? (
              <div className="max-w-xs text-gray-500 dark:text-gray-400">
                <p className="text-base font-medium mb-1">Nenhum resultado encontrado</p>
                <p className="text-sm opacity-70">Não encontramos nada para &quot;{currentSearchTerm}&quot;</p>
              </div>
            ) : emptyConfig ? (
              <div className="flex flex-col items-center gap-3 max-w-sm">
                {emptyConfig.icon && (
                  <div className="text-gray-300 dark:text-gray-600 mb-1">
                    {emptyConfig.icon}
                  </div>
                )}
                {emptyConfig.title && (
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {emptyConfig.title}
                  </h3>
                )}
                {emptyConfig.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {emptyConfig.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="max-w-xs text-gray-500 dark:text-gray-400">
                <p className="text-sm">{emptyMessage}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredItems.map((item, index) => (
              <div key={index}>
                {renderItem(item)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
