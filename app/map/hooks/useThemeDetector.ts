import { useState, useEffect } from 'react'

export function useThemeDetector() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Initial check
    const checkTheme = () => {
      // Check for 'dark' class on html element
      const isDarkTheme = document.documentElement.classList.contains('dark')
      setIsDark(isDarkTheme)
    }

    checkTheme()

    // Observer for class changes on html element
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  return isDark
}
