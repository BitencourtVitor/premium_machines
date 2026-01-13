import { filterMachinesForEvent } from '../utils'
import { ActiveAllocation, ActiveDowntime } from '../types'

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
