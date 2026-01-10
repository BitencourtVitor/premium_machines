'use client'

import { forwardRef } from 'react'

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: boolean
  helperText?: string
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ label, error = false, helperText, className = '', ...props }, ref) => {
    const isDateInput = props.type === 'date'
    
    const baseClasses = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
    
    const dateClasses = isDateInput 
      ? '[color-scheme:light] dark:[color-scheme:dark]'
      : ''
    
    const borderClasses = error
      ? '!border-red-500 dark:!border-red-500 focus:!ring-red-500'
      : ''
    
    const disabledClasses = props.disabled
      ? 'opacity-50 cursor-not-allowed'
      : ''
    
    const inputClasses = `${baseClasses} ${dateClasses} ${borderClasses} ${disabledClasses} ${className}`

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        {helperText && (
          <p className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

CustomInput.displayName = 'CustomInput'

export default CustomInput
