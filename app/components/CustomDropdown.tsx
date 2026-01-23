'use client'

import { useState, useEffect, useRef } from 'react'

interface CustomDropdownOption {
  value: string
  label: string
  description?: string
}

interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: CustomDropdownOption[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  label?: string
  searchable?: boolean
  descriptionLayout?: 'below' | 'beside'
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  className = '',
  label,
  searchable,
  descriptionLayout = 'below',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isSearchable = searchable !== undefined ? searchable : options.length > 10

  const selectedOption = options.find(opt => opt.value === value)

  const filteredOptions = options.filter(opt => {
    if (!isSearchable || !searchTerm) return true
    const search = searchTerm.toLowerCase()
    return opt.label.toLowerCase().includes(search) || 
           (opt.description && opt.description.toLowerCase().includes(search))
  })

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
      searchInputRef.current.focus()
      setHighlightedIndex(0)
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

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % filteredOptions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
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
        onKeyDown={(e) => {
          if (!isOpen && !disabled && /^[a-zA-Z0-9]$/.test(e.key)) {
            setIsOpen(true)
            setSearchTerm(e.key)
          } else if (isOpen) {
            handleKeyDown(e)
          }
        }}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className={`flex ${descriptionLayout === 'beside' ? 'flex-row items-center gap-1.5' : 'flex-col items-start'} overflow-hidden`}>
          <span className="text-sm truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.description && (
            <span className={`${descriptionLayout === 'beside' ? 'text-[10px]' : 'text-[10px] mt-0.5'} text-gray-500 dark:text-gray-400 leading-none uppercase tracking-wider font-semibold whitespace-nowrap`}>
              {descriptionLayout === 'beside' && <span className="mr-1.5 text-gray-300 dark:text-gray-600">|</span>}
              {selectedOption.description}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setHighlightedIndex(0)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Pesquisar..."
                  autoComplete="off"
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
                    title="Clear search"
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
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                {isSearchable && searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma opção disponível'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredOptions.map((option, index) => (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      value === option.value
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : index === highlightedIndex
                        ? 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className={`flex ${descriptionLayout === 'beside' ? 'flex-row items-center gap-1.5' : 'flex-col'}`}>
                      <span className="font-medium">{option.label}</span>
                      {option.description && (
                        <span className={`${descriptionLayout === 'beside' ? 'text-[10px]' : 'text-xs mt-0.5'} uppercase tracking-wider font-semibold ${
                          value === option.value 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {descriptionLayout === 'beside' && <span className="mr-1.5 text-gray-300 dark:text-gray-600">|</span>}
                          {option.description}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {required && !value && (
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
