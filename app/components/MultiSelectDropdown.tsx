'use client'

import { useState, useEffect, useRef } from 'react'

interface MultiSelectDropdownOption {
  value: string
  label: string
  description?: string
}

interface MultiSelectDropdownProps {
  value: string[]
  onChange: (value: string[]) => void
  options: MultiSelectDropdownOption[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  label?: string
  searchable?: boolean
}

export default function MultiSelectDropdown({
  value = [],
  onChange,
  options,
  placeholder = 'Selecione as opções',
  disabled = false,
  required = false,
  className = '',
  label,
  searchable,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isSearchable = searchable !== undefined ? searchable : options.length > 10

  const filteredOptions = isSearchable && searchTerm
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (!buttonRef.current) return
        
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const spaceBelow = viewportHeight - buttonRect.bottom
        const spaceAbove = buttonRect.top
        const dropdownHeight = 256
        const minSpace = 50
        
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow + minSpace) {
          setDropdownPosition('top')
        } else {
          setDropdownPosition('bottom')
        }
      }
      
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    } else if (!isOpen) {
      setSearchTerm('')
    }
  }, [isOpen, isSearchable])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  const isAllSelected = options.length > 0 && value.length === options.length

  const toggleAll = () => {
    if (isAllSelected) {
      onChange([])
    } else {
      onChange(options.map(opt => opt.value))
    }
  }

  const getButtonText = () => {
    if (value.length === 0) return placeholder
    if (value.length === options.length) return 'Todos selecionados'
    if (value.length === 1) {
      const selected = options.find(opt => opt.value === value[0])
      return selected ? selected.label : placeholder
    }
    return `${value.length} selecionados`
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="text-sm truncate mr-2">
          {getButtonText()}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && !disabled && buttonRef.current && (
        <div 
          ref={dropdownMenuRef}
          className="fixed z-[9999] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col"
          style={{
            width: `${buttonRef.current.offsetWidth}px`,
            left: `${buttonRef.current.getBoundingClientRect().left}px`,
            [dropdownPosition === 'top' ? 'bottom' : 'top']: dropdownPosition === 'top' 
              ? `${window.innerHeight - buttonRef.current.getBoundingClientRect().top + 4}px`
              : `${buttonRef.current.getBoundingClientRect().bottom + 4}px`,
          }}
        >
          {isSearchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  onClick={(e) => e.stopPropagation()}
                />
                <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSearchTerm('')
                      searchInputRef.current?.focus()
                    }}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Limpar busca"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="overflow-y-auto max-h-48">
            <div className="p-2 space-y-1">
              {!searchTerm && options.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-gray-600 mb-1 pb-2"
                >
                  <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                    isAllSelected 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {isAllSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  </span>
                </button>
              )}

              {filteredOptions.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  {isSearchable && searchTerm ? 'Nenhuma opção encontrada' : 'Nenhuma opção disponível'}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : ''
                      }`}
                    >
                      <div className={`w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-300 dark:border-gray-500'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-medium truncate ${
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                        }`}>
                          {option.label}
                        </span>
                        {option.description && (
                          <span className={`text-xs truncate ${
                            isSelected 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {option.description}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
      {required && value.length === 0 && (
        <input
          type="text"
          required
          className="hidden"
          tabIndex={-1}
          value=""
          onChange={() => {}}
        />
      )}
    </div>
  )
}
