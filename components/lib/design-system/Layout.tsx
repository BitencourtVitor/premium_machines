import React from 'react'

interface GridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8
  className?: string
}

export const Grid: React.FC<GridProps> = ({ 
  children, 
  cols = 1, 
  gap = 4, 
  className = '' 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-12'
  }

  const gapSize = {
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8'
  }

  return (
    <div className={`grid ${gridCols[cols]} ${gapSize[gap]} ${className}`}>
      {children}
    </div>
  )
}

interface ContainerProps {
  children: React.ReactNode
  className?: string
  fluid?: boolean
}

export const Container: React.FC<ContainerProps> = ({ 
  children, 
  className = '', 
  fluid = false 
}) => {
  return (
    <div className={`
      mx-auto px-4 sm:px-6 lg:px-8 
      ${fluid ? 'w-full' : 'max-w-7xl'} 
      ${className}
    `}>
      {children}
    </div>
  )
}
