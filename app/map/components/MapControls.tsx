'use client'

import React, { useState, useRef, useEffect } from 'react'

interface MapControlsProps {
  mapStyle: 'map' | 'satellite'
  toggleMapStyle: () => void
  onSearch: (query: string) => void
  filters: {
    showHeadquarters: boolean
    showJobsites: boolean
    statuses: string[]
  }
  setFilters: (filters: {
    showHeadquarters: boolean
    showJobsites: boolean
    statuses: string[]
  }) => void
}

export default function MapControls({ 
  mapStyle, 
  toggleMapStyle, 
  onSearch, 
  filters, 
  setFilters 
}: MapControlsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isStatusFilterExpanded, setIsStatusFilterExpanded] = useState(false)
  const [searchText, setSearchText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSearchOpen])

  // Close filter when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchText(value)
    onSearch(value)
  }

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen)
    if (isSearchOpen) {
      setSearchText('')
      onSearch('')
    }
  }

  return (
    <div className="absolute top-4 left-4 z-[10001] flex items-start gap-2">
      {/* Map Style Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 h-10 w-10 flex items-center justify-center">
        <button
          onClick={toggleMapStyle}
          className="p-1 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          title={mapStyle === 'satellite' ? 'Modo Satélite' : 'Modo Mapa'}
        >
          {mapStyle === 'satellite' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Filter Button and Popover */}
      <div className="relative" ref={filterRef}>
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 h-10 w-10 flex items-center justify-center transition-colors ${isFilterOpen ? 'ring-2 ring-blue-500' : ''}`}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-1 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${isFilterOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
            title="Filtros"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Popover Content */}
        {isFilterOpen && (
          <div className="absolute top-12 left-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mostrar no Mapa</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.showHeadquarters}
                      onChange={(e) => setFilters({ ...filters, showHeadquarters: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Premium Group (Sede)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.showJobsites}
                      onChange={(e) => setFilters({ ...filters, showJobsites: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Jobsites</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-50 dark:border-gray-700">
                <button 
                  onClick={() => setIsStatusFilterExpanded(!isStatusFilterExpanded)}
                  className="w-full flex justify-between items-center group transition-colors"
                >
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group-hover:text-blue-500 transition-colors">
                    Filtrar por status
                  </label>
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isStatusFilterExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isStatusFilterExpanded && (
                  <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {[
                      { id: 'maintenance', label: 'Manutenção', color: 'bg-orange-500' },
                      { id: 'exceeded', label: 'Excedida', color: 'bg-red-500' },
                      { id: 'active', label: 'Ativa', color: 'bg-green-500' },
                      { id: 'scheduled', label: 'Agendada', color: 'bg-blue-500' },
                      { id: 'moved', label: 'Movida', color: 'bg-pink-500' },
                      { id: 'finished', label: 'Encerrada', color: 'bg-purple-500' },
                      { id: 'none', label: 'Sem Alocação', color: 'bg-gray-400' },
                    ].map((status) => (
                      <label key={status.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={filters.statuses.includes(status.id)}
                          onChange={(e) => {
                            const newStatuses = e.target.checked
                              ? [...filters.statuses, status.id]
                              : filters.statuses.filter((s: string) => s !== status.id)
                            setFilters({ ...filters, statuses: newStatuses })
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        <span className="text-sm text-gray-700 dark:text-gray-200">{status.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center p-1 transition-all duration-300 ease-in-out h-10 overflow-hidden ${
          isSearchOpen ? 'w-64 md:w-80' : 'w-10'
        }`}
      >
        <button
          onClick={toggleSearch}
          className="h-full w-8 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0 transition-colors"
          title="Pesquisar"
          aria-label="Pesquisar"
          aria-expanded={isSearchOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={handleSearchChange}
          placeholder="Buscar jobsite, endereço, máquina..."
          className={`bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 h-full px-2 w-full ${
            isSearchOpen ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-200`}
          tabIndex={isSearchOpen ? 0 : -1}
        />
      </div>
    </div>
  )
}
