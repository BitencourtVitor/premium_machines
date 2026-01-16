'use client'

import { useRef, useEffect, useState } from 'react'

interface PinInputProps {
  length?: number
  onComplete: (pin: string) => void
  disabled?: boolean
  error?: boolean
}

export default function PinInput({ length = 6, onComplete, disabled = false, error = false }: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    // Clear inputs when error changes
    if (error) {
      setValues(Array(length).fill(''))
      inputRefs.current[0]?.focus()
    }
  }, [error, length])

  const handleChange = (index: number, value: string) => {
    if (disabled) return

    // Only accept numbers
    const numericValue = value.replace(/\D/g, '')
    
    if (numericValue.length > 1) {
      // Handle paste
      const newValues = [...values]
      const digits = numericValue.slice(0, length - index).split('')
      digits.forEach((digit, i) => {
        if (index + i < length) {
          newValues[index + i] = digit
        }
      })
      setValues(newValues)
      
      // Move to next empty input or last input
      const nextIndex = Math.min(index + digits.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
      
      // Check if complete
      if (newValues.every(v => v !== '')) {
        onComplete(newValues.join(''))
      }
    } else {
      // Single digit input
      const newValues = [...values]
      newValues[index] = numericValue
      setValues(newValues)

      if (numericValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      // Check if complete
      if (newValues.every(v => v !== '')) {
        onComplete(newValues.join(''))
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select()
  }

  return (
    <div className="flex gap-1.5 md:gap-2 justify-center">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value ? '•' : ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={`
            w-10 h-12 md:w-12 md:h-14 text-center text-xl md:text-2xl font-bold rounded-lg border-2 
            transition-all duration-200
            ${error 
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800'
            }
            text-gray-900 dark:text-white
          `}
        />
      ))}
    </div>
  )
}
