import { useState, useEffect } from 'react'
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
  const [retryWithPng, setRetryWithPng] = useState(false)
  const [retryWithJpg, setRetryWithJpg] = useState(false)

  // Basic validation to prevent rendering invalid URLs
  const isValidSrc = src && typeof src === 'string' && src.length > 0 && !src.includes('localhost:3000')

  // Reset error when src changes
  useEffect(() => {
    setError(false)
    setRetryWithPng(false)
    setRetryWithJpg(false)
  }, [src])

  const hasExtension = (path: string) => {
    if (!path) return false
    const lastPart = path.split('/').pop() || ''
    return lastPart.includes('.')
  }

  if ((error && !retryWithPng && !retryWithJpg) || !isValidSrc) {
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

  let finalSrc = src
  if (retryWithPng && !hasExtension(src)) finalSrc = `${src}.png`
  else if (retryWithJpg && !hasExtension(src)) finalSrc = `${src}.jpg`

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ width: size, height: size }}>
      <Image
        src={finalSrc}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        unoptimized={true} // Bypass Next.js optimization to avoid 400 errors from Supabase
        onError={() => {
          if (!hasExtension(finalSrc)) {
            if (!retryWithPng && !retryWithJpg) {
              setRetryWithPng(true)
            } else if (retryWithPng) {
              setRetryWithPng(false)
              setRetryWithJpg(true)
            } else {
              setError(true)
            }
          } else {
            setError(true)
          }
        }}
      />
    </div>
  )
}
