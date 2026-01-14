import { filterMachinesForEvent, getEventConfig, formatDate } from '../utils'
import { ActiveAllocation, ActiveDowntime } from '../types'

describe('formatDate', () => {
  it('should format date correctly', () => {
    // Using a fixed date for testing
    const date = '2023-01-01T12:00:00'
    const formatted = formatDate(date)
    // The exact output depends on the locale, but we can check the structure
    // Since the implementation uses 'en-US', we expect MM/DD/YYYY, HH:MM AM/PM
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2} [AP]M/)
  })
})

describe('getEventConfig', () => {
  it('should return correct config for start_allocation', () => {
    const config = getEventConfig('start_allocation')
    expect(config).toEqual(expect.objectContaining({
      label: 'Alocação de Máquina',
      color: 'blue',
      textColor: 'text-[#2E86C1]'
    }))
  })

  it('should return correct config for end_allocation', () => {
    const config = getEventConfig('end_allocation')
    expect(config).toEqual(expect.objectContaining({
      label: 'Fim de Alocação',
      color: 'red',
      textColor: 'text-red-600 dark:text-red-400'
    }))
  })

  it('should return correct config for downtime_start', () => {
    const config = getEventConfig('downtime_start')
    expect(config).toEqual(expect.objectContaining({
      label: 'Início de Manutenção',
      color: 'orange',
      textColor: 'text-orange-600 dark:text-orange-400'
    }))
  })

  it('should return correct config for downtime_end', () => {
    const config = getEventConfig('downtime_end')
    expect(config).toEqual(expect.objectContaining({
      label: 'Fim de Manutenção',
      color: 'green',
      textColor: 'text-green-600 dark:text-green-400'
    }))
  })

  it('should return default config for unknown type', () => {
    const config = getEventConfig('unknown_type')
    expect(config).toEqual(expect.objectContaining({
      label: 'unknown_type',
      color: 'gray',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    }))
  })
})

describe('filterMachinesForEvent', () => {
  const machines = [
    { id: '1', name: 'Machine 1' },
    { id: '2', name: 'Machine 2' },
    { id: '3', name: 'Machine 3' },
  ]

  const activeAllocations: ActiveAllocation[] = [
    {
      allocation_event_id: 'alloc1',
      machine_id: '1',
      machine_unit_number: 'M1',
      machine_type: 'Type1',
      machine_ownership: 'owned',
      machine_supplier_name: null,
      site_id: 'site1',
      site_title: 'Site 1',
      construction_type: null,
      lot_building_number: null,
      allocation_start: '2023-01-01',
      is_in_downtime: false,
      current_downtime_event_id: null,
      current_downtime_reason: null,
      current_downtime_start: null,
    },
  ]

  const activeDowntimes: ActiveDowntime[] = [
    {
      downtime_event_id: 'down1',
      machine_id: '2',
      machine_unit_number: 'M2',
      site_id: 'site1',
      site_title: 'Site 1',
      downtime_reason: 'defect',
      downtime_start: '2023-01-01',
    },
  ]

  it('should return all machines for start_allocation', () => {
    const result = filterMachinesForEvent('start_allocation', machines, activeAllocations, activeDowntimes)
    expect(result).toEqual(machines)
  })

  it('should return only allocated machines for end_allocation', () => {
    const result = filterMachinesForEvent('end_allocation', machines, activeAllocations, activeDowntimes)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('should return only machines in downtime for downtime_end', () => {
    const result = filterMachinesForEvent('downtime_end', machines, activeAllocations, activeDowntimes)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('should return all machines for other event types', () => {
    const result = filterMachinesForEvent('refueling', machines, activeAllocations, activeDowntimes)
    expect(result).toEqual(machines)
  })
})
