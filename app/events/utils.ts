import { ActiveAllocation, ActiveDowntime } from './types'

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
    case 'extension_attach':
      return machines.filter(m => !allocatedIds.includes(m.id))
    
    case 'end_allocation':
    case 'refueling':
      return machines.filter(m => allocatedIds.includes(m.id))
      
    case 'downtime_start':
      return machines.filter(m => allocatedIds.includes(m.id) && !downtimeIds.includes(m.id))
      
    case 'downtime_end':
      return machines.filter(m => downtimeIds.includes(m.id))
      
    default:
      return machines
  }
}

