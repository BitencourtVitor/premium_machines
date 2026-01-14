import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SiteDetailsModal from '../SiteDetailsModal'

// Mock MachineImage component
jest.mock('@/app/components/MachineImage', () => {
  return function MockMachineImage() {
    return <div data-testid="machine-image">Machine Image</div>
  }
})

// Mock utility functions to avoid import issues in test environment
// if needed. But we are importing them from relative paths in component, so imports should work.

const mockSite = {
  id: 'site1',
  title: 'Test Site',
  address: '123 Test St',
  city: 'Test City'
}

const mockAllocations = [
  {
    allocation_event_id: 'alloc1',
    machine_id: 'm1',
    machine_unit_number: 'M001',
    machine_name: 'Excavator',
    machine_type: 'Type 1',
    machine_ownership: 'owned'
  }
]

const mockEvents = [
  {
    id: 'e1',
    event_type: 'start_allocation',
    event_date: '2023-01-01',
    status: 'approved',
    machine_id: 'm1'
  }
]

describe('SiteDetailsModal', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return null when isOpen is false', () => {
    const { container } = render(
      <SiteDetailsModal
        isOpen={false}
        onClose={mockOnClose}
        site={mockSite}
        loading={false}
        allocations={mockAllocations}
        events={mockEvents}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should return null when site is missing and not loading', () => {
    const { container } = render(
      <SiteDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        site={null}
        loading={false}
        allocations={[]}
        events={[]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render loading state', () => {
    render(
      <SiteDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        site={mockSite}
        loading={true}
        allocations={[]}
        events={[]}
      />
    )
    expect(screen.getByText('Test Site')).toBeInTheDocument()
    // You might want to add a data-testid to the spinner for better testing
  })

  it('should render correct content when open', () => {
    render(
      <SiteDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        site={mockSite}
        loading={false}
        allocations={mockAllocations}
        events={mockEvents}
      />
    )
    
    expect(screen.getByText('Test Site')).toBeInTheDocument()
    expect(screen.getByText('123 Test St')).toBeInTheDocument()
    expect(screen.getByText('M001')).toBeInTheDocument()
    expect(screen.getByText('Máquinas')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    render(
      <SiteDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        site={mockSite}
        loading={false}
        allocations={mockAllocations}
        events={mockEvents}
      />
    )
    
    const closeButton = screen.getByLabelText('Fechar modal')
    fireEvent.click(closeButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when ESC key is pressed', () => {
    render(
      <SiteDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        site={mockSite}
        loading={false}
        allocations={mockAllocations}
        events={mockEvents}
      />
    )
    
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should display correct status color for calendar days', () => {
    // Mock system time to match event date (January 2023)
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2023-01-15'))

    render(
      <SiteDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        site={mockSite}
        loading={false}
        allocations={mockAllocations}
        events={mockEvents}
      />
    )
    
    // Find day 15 which should be allocated (green) since start_allocation was on Jan 1st
    // The number is inside a div with classes w-8 h-8 ...
    const dayCells = screen.getAllByText('15')
    const dayCell = dayCells.find(el => el.className.includes('w-8'))
    
    expect(dayCell).toBeInTheDocument()
    // Check for green background class (working status)
    expect(dayCell).toHaveClass('bg-green-100')
    
    jest.useRealTimers()
  })
})
