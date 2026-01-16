'use client'

import { useState, useEffect, useRef } from 'react'

interface TimeInputProps {
  value: string // Format "HH:MM" (24h)
  onChange: (value: string) => void
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
}

export default function TimeInput({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error,
}: TimeInputProps) {
  // Internal state
  const [hours, setHours] = useState<string>('')
  const [minutes, setMinutes] = useState<string>('')
  const [amPm, setAmPm] = useState<'AM' | 'PM'>('AM')
  
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number)
      if (!isNaN(h) && !isNaN(m)) {
        const isPm = h >= 12
        const h12 = h % 12 || 12
        setHours(h12.toString().padStart(2, '0'))
        setMinutes(m.toString().padStart(2, '0'))
        setAmPm(isPm ? 'PM' : 'AM')
      }
    } else {
      setHours('')
      setMinutes('')
      setAmPm('AM')
    }
  }, [value])

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isDropdownOpen])

  // Calculate dropdown position
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const updatePosition = () => {
        if (!buttonRef.current) return
        
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const spaceBelow = viewportHeight - buttonRect.bottom
        const spaceAbove = buttonRect.top
        const dropdownHeight = 100 // Approximate height for 2 options
        
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
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
  }, [isDropdownOpen])

  // Update parent with 24h format
  const updateParent = (h: string, m: string, period: 'AM' | 'PM') => {
    if (!h || !m) {
      if (h === '' && m === '') {
        onChange('')
      }
      return
    }

    const hNum = parseInt(h, 10)
    const mNum = parseInt(m, 10)

    if (isNaN(hNum) || isNaN(mNum)) return

    let h24 = hNum
    if (period === 'PM' && hNum !== 12) h24 += 12
    if (period === 'AM' && hNum === 12) h24 = 0

    const timeString = `${h24.toString().padStart(2, '0')}:${mNum.toString().padStart(2, '0')}`
    onChange(timeString)
  }

  // Simplified Input Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '')
    
    if (raw.length > 4) raw = raw.slice(0, 4)

    let formatted = ''
    let h = ''
    let m = ''

    if (raw.length > 0) {
      // First digit
      if (parseInt(raw[0]) > 1) {
        // If > 1 (e.g. 2..9), assume 02..09
        h = '0' + raw[0]
        // Remaining digits are minutes
        if (raw.length > 1) {
          m = raw.slice(1, 3)
        }
      } else {
        // Starts with 0 or 1
        if (raw.length >= 2) {
          let hVal = parseInt(raw.slice(0, 2))
          if (hVal > 12) {
             h = '12'
          } else if (hVal === 0) {
             h = '12' // 00 -> 12
          } else {
             h = raw.slice(0, 2)
          }
          
          if (raw.length > 2) {
            m = raw.slice(2, 4)
          }
        } else {
          h = raw
        }
      }
    }

    // Validate minutes
    if (m.length === 2 && parseInt(m) > 59) m = '59'

    setHours(h)
    setMinutes(m)
    
    if (h.length === 2 && m.length === 2) {
      updateParent(h, m, amPm)
    }
  }

  const displayValue = (hours && hours.length > 0) 
    ? (minutes || (hours.length === 2 ? '' : '')) 
      ? `${hours}:${minutes}` 
      : hours 
    : ''

  const handleBlur = () => {
    // Pad hours/minutes on blur if needed
    let h = hours
    let m = minutes
    if (h.length === 1) h = '0' + h
    if (m.length === 1) m = '0' + m
    
    setHours(h)
    setMinutes(m)
    updateParent(h, m, amPm)
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div 
        className={`
          relative flex items-center w-full bg-white dark:bg-gray-700 
          border border-gray-300 dark:border-gray-600 rounded-lg 
          focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent
          transition-all duration-200 px-3 py-2
          ${error ? 'border-red-500' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Time Input Area */}
        <input
          type="text"
          inputMode="numeric"
          placeholder="00:00"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="
            w-[3.5rem] bg-transparent border-none outline-none 
            text-gray-900 dark:text-white 
            placeholder-gray-400 dark:placeholder-gray-500
            text-sm text-center
          "
          maxLength={5}
        />

        {/* AM/PM Dropdown Trigger */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className="
              flex items-center justify-center gap-1
              text-sm text-gray-700 dark:text-gray-300 
              hover:text-gray-900 dark:hover:text-white
              transition-colors outline-none
            "
          >
            <span>{amPm}</span>
            <svg 
              className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="fixed z-[9999] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden flex flex-col min-w-[60px]"
              style={{
                left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left : 0,
                [dropdownPosition === 'top' ? 'bottom' : 'top']: buttonRef.current 
                  ? (dropdownPosition === 'top' 
                      ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 4 
                      : buttonRef.current.getBoundingClientRect().bottom + 4)
                  : 0,
              }}
            >
              {['AM', 'PM'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setAmPm(option as 'AM' | 'PM')
                    updateParent(hours, minutes, option as 'AM' | 'PM')
                    setIsDropdownOpen(false)
                  }}
                  className={`
                    w-full text-center px-3 py-2 text-sm transition-colors
                    ${amPm === option 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    }
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer to push icon to right */}
        <div className="flex-grow" />

        {/* Clock Icon (Decorative) */}
        <div className="ml-2 text-gray-400 dark:text-gray-500 select-none pointer-events-none flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}
