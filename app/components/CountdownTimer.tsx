'use client'

import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  seconds: number
  onComplete?: () => void
}

export default function CountdownTimer({ seconds, onComplete }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.()
      return
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [remaining, onComplete])

  const minutes = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
        {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">Aguarde antes de tentar novamente</p>
    </div>
  )
}
