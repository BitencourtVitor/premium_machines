import { useState } from 'react'
import Image from 'next/image'

interface MachineImageProps {
  src: string
  alt: string
  size?: number
  className?: string
  showFallback?: boolean
}

export default function MachineImage({ src, alt, size = 48, className = '', showFallback = true }: MachineImageProps) {
  const [error, setError] = useState(false)

  if (error) {
    if (!showFallback) return null
    
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`} 
        style={{ width: size, height: size }}
      >
        <svg className="w-1/2 h-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        onError={() => setError(true)}
      />
    </div>
  )
}
