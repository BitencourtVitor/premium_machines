import React from 'react'

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'small'

interface TextProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
  as?: any
}

export const Text: React.FC<TextProps> = ({ 
  variant = 'body', 
  children, 
  className = '', 
  as 
}) => {
  const styles = {
    h1: 'text-4xl font-bold tracking-tight',
    h2: 'text-3xl font-bold tracking-tight',
    h3: 'text-2xl font-bold',
    h4: 'text-xl font-semibold',
    h5: 'text-lg font-semibold',
    h6: 'text-base font-semibold',
    body: 'text-base',
    caption: 'text-sm text-gray-500 dark:text-gray-400',
    small: 'text-xs'
  }

  const Component = as || (
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(variant) ? variant : 'p'
  )

  return (
    <Component className={`${styles[variant]} ${className}`}>
      {children}
    </Component>
  )
}
