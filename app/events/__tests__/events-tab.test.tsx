import { render, screen, fireEvent } from '@testing-library/react'
import EventsTab from '../components/EventsTab'
import { AllocationEvent } from '../types'

// Mock icons
jest.mock('react-icons/fi', () => ({
  FiCalendar: () => <div data-testid="icon-calendar" />,
  FiUser: () => <div data-testid="icon-user" />,
  FiMapPin: () => <div data-testid="icon-map-pin" />,
  FiInfo: () => <div data-testid="icon-info" />,
  FiTool: () => <div data-testid="icon-tool" />,
  FiCheckCircle: () => <div data-testid="icon-check-circle" />,
  FiXCircle: () => <div data-testid="icon-x-circle" />,
  FiDroplet: () => <div data-testid="icon-droplet" />,
  FiFileText: () => <div data-testid="icon-file-text" />,
}))

jest.mock('react-icons/gi', () => ({
  GiKeyCard: () => <div data-testid="icon-key-card" />,
}))

jest.mock('react-icons/lu', () => ({
  LuPuzzle: () => <div data-testid="icon-puzzle" />,
}))

// Mock permissions utils
jest.mock('@/lib/permissions', () => ({
  EVENT_STATUS_LABELS: { approved: 'Aprovado' },
  EVENT_TYPE_LABELS: { start_allocation: 'Alocação de Máquina' },
  DOWNTIME_REASON_LABELS: {},
}))

// Mock utils
jest.mock('../utils', () => ({
  formatDate: (date: string) => date,
}))

describe('EventsTab', () => {
  const mockEvents: AllocationEvent[] = [
    {
      id: '1',
      event_type: 'start_allocation',
      machine: { id: '1', unit_number: 'M001' },
      site: { id: '1', title: 'Obra 1' },
      event_date: '2024-01-01T00:00:00',
      status: 'approved',
      created_by_user: { nome: 'Usuário 1' },
      created_at: '2024-01-01T00:00:00',
    },
  ]

  const defaultProps = {
    filterStatus: '',
    setFilterStatus: jest.fn(),
    filterType: '',
    setFilterType: jest.fn(),
    filteredEvents: mockEvents,
    loadingEvents: false,
    loadEvents: jest.fn(),
    user: { can_register_events: true, role: 'user' },
    setShowCreateModal: jest.fn(),
    handleEditEvent: jest.fn(),
    handleDeleteEvent: jest.fn(),
    startDate: '',
    setStartDate: jest.fn(),
    endDate: '',
    setEndDate: jest.fn(),
  }

  it('renders event cards with correct information', () => {
    render(<EventsTab {...defaultProps} />)

    expect(screen.getByText('M001')).toBeInTheDocument()
    expect(screen.getByText('Obra 1')).toBeInTheDocument()
    expect(screen.getByText('Usuário 1')).toBeInTheDocument()
    
    // Check icons
    expect(screen.getByTestId('icon-calendar')).toBeInTheDocument()
    expect(screen.getByTestId('icon-user')).toBeInTheDocument()
    expect(screen.getByTestId('icon-map-pin')).toBeInTheDocument()
  })

  it('shows edit and delete buttons for authorized users', () => {
    render(<EventsTab {...defaultProps} />)
    
    const editButton = screen.getByLabelText('Editar evento da máquina M001')
    expect(editButton).toBeInTheDocument()
    
    fireEvent.click(editButton)
    expect(defaultProps.handleEditEvent).toHaveBeenCalledWith(mockEvents[0])

    const deleteButton = screen.getByLabelText('Excluir evento da máquina M001')
    expect(deleteButton).toBeInTheDocument()

    fireEvent.click(deleteButton)
    expect(defaultProps.handleDeleteEvent).toHaveBeenCalledWith(mockEvents[0])
  })

  it('does not show edit/delete buttons for unauthorized users', () => {
    render(<EventsTab {...defaultProps} user={{ role: 'viewer' }} />)
    
    const editButton = screen.queryByLabelText('Editar evento da máquina M001')
    expect(editButton).not.toBeInTheDocument()

    const deleteButton = screen.queryByLabelText('Excluir evento da máquina M001')
    expect(deleteButton).not.toBeInTheDocument()
  })
})
