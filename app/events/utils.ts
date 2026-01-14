import { ActiveAllocation, ActiveDowntime } from './types'
import { EVENT_TYPE_LABELS } from '@/lib/permissions'
import { 
  FiCalendar, 
  FiUser, 
  FiMapPin, 
  FiInfo,
  FiTool,
  FiCheckCircle,
  FiXCircle,
  FiFileText
} from 'react-icons/fi'
import { GiKeyCard } from "react-icons/gi"
import { LuPuzzle } from "react-icons/lu"
import { PiGasCanBold } from "react-icons/pi"

/**
 * Formats a date string into a localized string (en-US).
 * Format: MM/DD/YYYY, HH:MM AM/PM
 * @param dateString - The ISO date string to format
 * @returns Formatted date string
 */
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Returns the visual configuration (icon, colors, labels) for a given event type.
 * Used to standardize event presentation across the application.
 * @param type - The event type string (e.g., 'start_allocation', 'downtime_start')
 * @returns Object containing visual properties (icon, color, label, bgColor, etc.)
 */
export const getEventConfig = (type: string) => {
  switch (type) {
    case 'start_allocation':
      return { 
        icon: GiKeyCard, 
        color: 'blue', 
        label: 'Alocação de Máquina',
        bgColor: 'bg-[#2E86C1]/10 dark:bg-[#2E86C1]/20',
        textColor: 'text-[#2E86C1]',
        borderColor: 'border-[#2E86C1]/20 dark:border-[#2E86C1]/30'
      }
    case 'end_allocation':
      return { 
        icon: FiXCircle, 
        color: 'red', 
        label: 'Fim de Alocação',
        bgColor: 'bg-red-100 dark:bg-red-900/40',
        textColor: 'text-red-600 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-800'
      }
    case 'start_downtime':
    case 'downtime_start':
      return { 
        icon: FiTool, 
        color: 'orange', 
        label: 'Início de Manutenção',
        bgColor: 'bg-orange-100 dark:bg-orange-900/40',
        textColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'border-orange-200 dark:border-orange-800'
      }
    case 'end_downtime':
    case 'downtime_end':
      return { 
        icon: FiCheckCircle, 
        color: 'green', 
        label: 'Fim de Manutenção',
        bgColor: 'bg-green-100 dark:bg-green-900/40',
        textColor: 'text-green-600 dark:text-green-400',
        borderColor: 'border-green-200 dark:border-green-800'
      }
    case 'refueling':
      return { 
        icon: PiGasCanBold, 
        color: 'yellow', 
        label: 'Abastecimento',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      }
    case 'request_allocation':
      return { 
        icon: FiFileText, 
        color: 'purple', 
        label: 'Solicitação de Alocação',
        bgColor: 'bg-purple-100 dark:bg-purple-900/40',
        textColor: 'text-purple-600 dark:text-purple-400',
        borderColor: 'border-purple-200 dark:border-purple-800'
      }
    case 'extension_attach':
      return { 
        icon: LuPuzzle, 
        color: 'indigo', 
        label: 'Alocação de Extensão',
        bgColor: 'bg-[#F39C12]/10 dark:bg-[#F39C12]/20',
        textColor: 'text-[#F39C12]',
        borderColor: 'border-[#F39C12]/20 dark:border-[#F39C12]/30'
      }
    default:
      return { 
        icon: FiInfo, 
        color: 'gray', 
        label: EVENT_TYPE_LABELS[type] || type,
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-600 dark:text-gray-400',
        borderColor: 'border-gray-200 dark:border-gray-700'
      }
  }
}

export const filterMachinesForEvent = (
  eventType: string,
  machines: any[],
  activeAllocations: ActiveAllocation[],
  activeDowntimes: ActiveDowntime[]
) => {
  const allocatedIds = activeAllocations.map(a => a.machine_id)
  const downtimeIds = activeDowntimes.map(d => d.machine_id)

  switch (eventType) {
    case 'start_allocation':
    case 'request_allocation':
      return machines.filter(m => !allocatedIds.includes(m.id))
    case 'extension_attach':
      return machines
      
    case 'end_allocation':
      return machines.filter(m => allocatedIds.includes(m.id))
    case 'refueling':
      return machines
      
    case 'downtime_start':
      return machines.filter(m => allocatedIds.includes(m.id) && !downtimeIds.includes(m.id))
      
    case 'downtime_end':
      return machines.filter(m => downtimeIds.includes(m.id))
      
    default:
      return machines
  }
}
