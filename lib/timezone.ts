/**
 * Timezone utilities for the application.
 * Handles conversion between DB time (GMT 0) and display time based on user settings.
 */

export const getTimezoneOffset = (): number => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('system_timezone')
    return saved ? parseInt(saved, 10) : 0
  }
  return 0
}

export const TIMEZONE_OPTIONS = [
  { value: '0', label: 'GMT 0 (UTC)', description: 'Coordinated Universal Time' },
  { value: '-3', label: 'Brasil (GMT -3)', description: 'Horário de Brasília' },
  { value: '-4', label: 'USA East Coast (GMT -4)', description: 'Eastern Daylight Time' },
  { value: '-5', label: 'USA Central (GMT -5)', description: 'Central Daylight Time' },
  { value: '-6', label: 'USA Mountain (GMT -6)', description: 'Mountain Daylight Time' },
  { value: '-7', label: 'USA Pacific (GMT -7)', description: 'Pacific Daylight Time' },
  { value: '-8', label: 'USA Alaska (GMT -8)', description: 'Alaska Daylight Time' },
  { value: '-10', label: 'USA Hawaii (GMT -10)', description: 'Hawaii-Aleutian Standard Time' },
  { value: '1', label: 'Europe (GMT +1)', description: 'Central European Time' },
  { value: '2', label: 'Europe (GMT +2)', description: 'Eastern European Time' },
  { value: '3', label: 'Europe (GMT +3)', description: 'Moscow Time' },
  { value: '5', label: 'Asia (GMT +5)', description: 'Pakistan Standard Time' },
  { value: '5.5', label: 'Asia (GMT +5:30)', description: 'India Standard Time' },
  { value: '8', label: 'Asia (GMT +8)', description: 'China Standard Time' },
  { value: '9', label: 'Asia (GMT +9)', description: 'Japan Standard Time' },
  { value: '10', label: 'Australia (GMT +10)', description: 'Australian Eastern Standard Time' },
  { value: '11', label: 'Australia (GMT +11)', description: 'Australian Eastern Daylight Time' },
]

export const getTimezoneLabel = (): string => {
  const offset = getTimezoneOffset()
  const option = TIMEZONE_OPTIONS.find(opt => parseInt(opt.value, 10) === offset)
  return option ? option.label : `GMT ${offset >= 0 ? '+' : ''}${offset}`
}

/**
 * Adjusts a date from GMT 0 to the current system timezone.
 * @param date - The date to adjust (Date object or ISO string)
 * @returns Adjusted Date object
 */
export const adjustDateToSystemTimezone = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date
  const offset = getTimezoneOffset()
  
  // Add offset hours to the GMT date
  const adjusted = new Date(d.getTime() + offset * 60 * 60 * 1000)
  return adjusted
}

/**
 * Formats a date string using the system timezone.
 * @param dateString - ISO date string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted string
 */
export const formatWithSystemTimezone = (
  dateString: string, 
  options: Intl.DateTimeFormatOptions = {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string => {
  if (!dateString) return ''
  const adjusted = adjustDateToSystemTimezone(dateString)
  // Use 'UTC' timezone to prevent the browser from applying its local offset again
  return adjusted.toLocaleString('pt-BR', { ...options, timeZone: 'UTC' })
}

/**
 * Formats a date string using the system timezone, date only.
 * @param dateString - ISO date string
 * @returns Formatted string (DD/MM/YYYY)
 */
export const formatDateOnly = (dateString: string): string => {
  if (!dateString) return ''
  return formatWithSystemTimezone(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Converts a local datetime-local input value (YYYY-MM-DDTHH:mm) 
 * to a UTC ISO string based on the current system timezone.
 * @param localValue - The value from datetime-local input
 * @returns ISO string in UTC
 */
export const convertLocalToUtc = (localValue: string): string => {
  if (!localValue) return new Date().toISOString()
  
  const [datePart, timePart] = localValue.split('T')
  if (!datePart || !timePart) return new Date().toISOString()
  
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  
  // Create a Date object as if it were UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
  
  // Subtract the offset to get the real UTC time
  const offset = getTimezoneOffset()
  const realUtcDate = new Date(utcDate.getTime() - offset * 60 * 60 * 1000)
  
  return realUtcDate.toISOString()
}

/**
 * Gets a local datetime string (YYYY-MM-DDTHH:mm) for input fields
 * adjusted to the current system timezone.
 * @param date - Date object or ISO string (defaults to now)
 * @returns Formatted string for datetime-local input
 */
export const getLocalDateTimeForInput = (date: Date | string = new Date()): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const adjusted = adjustDateToSystemTimezone(d)
  
  const year = adjusted.getUTCFullYear()
  const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(adjusted.getUTCDate()).padStart(2, '0')
  const hours = String(adjusted.getUTCHours()).padStart(2, '0')
  const minutes = String(adjusted.getUTCMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
