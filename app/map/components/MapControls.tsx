import React, { useState, useRef, useEffect } from 'react'

interface MapControlsProps {
  mapStyle: 'map' | 'satellite'
  toggleMapStyle: () => void
  onSearch: (query: string) => void
}

export default function MapControls({ mapStyle, toggleMapStyle, onSearch }: MapControlsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSearchOpen])

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
    <div className="absolute top-4 left-4 z-10 flex items-start gap-2">
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
