import { render, screen } from '@testing-library/react'
import AllocationsTab from '../components/AllocationsTab'
import { ActiveAllocation } from '../types'

// Mock icons
jest.mock('react-icons/fi', () => ({
  FiCalendar: () => <div data-testid="icon-calendar" />,
  FiMapPin: () => <div data-testid="icon-map-pin" />,
  FiTool: () => <div data-testid="icon-tool" />,
  FiAlertTriangle: () => <div data-testid="icon-alert" />,
  FiCheckCircle: () => <div data-testid="icon-check" />,
  FiPlay: () => <div data-testid="icon-play" />,
  FiStopCircle: () => <div data-testid="icon-stop" />,
  FiXCircle: () => <div data-testid="icon-x" />,
  FiRefreshCw: () => <div data-testid="icon-refresh" />,
}))

// Mock permissions utils
jest.mock('@/lib/permissions', () => ({
  DOWNTIME_REASON_LABELS: { mechanical: 'Mecânica' },
}))

// Mock utils
jest.mock('../utils', () => ({
  formatDate: (date: string) => date,
}))

describe('AllocationsTab', () => {
  const mockAllocations: ActiveAllocation[] = [
    {
      allocation_event_id: '1',
      machine_id: 'm1',
      machine_unit_number: 'M001',
      machine_type: 'Escavadeira',
      machine_ownership: 'owned',
      machine_supplier_name: null,
      site_id: 's1',
      site_title: 'Obra 1',
      construction_type: 'lot',
      lot_building_number: '10',
      allocation_start: '2024-01-01',
      is_in_downtime: false,
      current_downtime_event_id: null,
      current_downtime_reason: null,
      current_downtime_start: null,
    },
    {
      allocation_event_id: '2',
      machine_id: 'm2',
      machine_unit_number: 'M002',
      machine_type: 'Trator',
      machine_ownership: 'rented',
      machine_supplier_name: 'Locadora X',
      site_id: 's2',
      site_title: 'Obra 2',
      construction_type: null,
      lot_building_number: null,
      allocation_start: '2024-01-02',
      is_in_downtime: true,
      current_downtime_event_id: 'd1',
      current_downtime_reason: 'mechanical',
      current_downtime_start: '2024-01-03',
    },
  ]

  const defaultProps = {
    activeAllocations: mockAllocations,
    loadingAllocations: false,
    loadActiveAllocations: jest.fn(),
    user: { can_register_events: true },
    setShowCreateModal: jest.fn(),
    handleStartDowntime: jest.fn(),
    handleEndAllocation: jest.fn(),
    handleEndDowntime: jest.fn(),
    handleNewEvent: jest.fn(),
    activeDowntimes: [],
    creating: false,
  }

  it('renders allocation cards correctly', () => {
    render(<AllocationsTab {...defaultProps} />)

    // Check machine M001 (Active)
    expect(screen.getByText('M001')).toBeInTheDocument()
    expect(screen.getByText('Operando')).toBeInTheDocument()
    expect(screen.getByText('Escavadeira')).toBeInTheDocument()
    expect(screen.getByText('(Própria)')).toBeInTheDocument()
    expect(screen.getByText('Obra 1')).toBeInTheDocument()
    
    // Check machine M002 (Downtime)
    expect(screen.getByText('M002')).toBeInTheDocument()
    expect(screen.getByText('Em Downtime')).toBeInTheDocument()
    expect(screen.getByText('Mecânica')).toBeInTheDocument() // From mock label
  })

  it('shows correct actions based on state', () => {
    render(<AllocationsTab {...defaultProps} />)

    // M001 is active, should show Stop and End
    // Since we have multiple buttons, we need to find specific ones. 
    // In a real test we might use data-testid on buttons or find by text within the card context.
    // For simplicity, checking if text exists in document.
    expect(screen.getByText('Parada')).toBeInTheDocument()
    expect(screen.getByText('Encerrar')).toBeInTheDocument()
    
    // M002 is downtime, should show Resume
    expect(screen.getByText('Retomar')).toBeInTheDocument()
  })
})
