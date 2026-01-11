import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MetricCardComponent } from '../metrics/MetricCardComponent'

describe('MetricCardComponent', () => {
  it('renders label and value', () => {
    render(
      <MetricCardComponent
        label="Total Revenue"
        value="$50,000"
      />
    )

    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('$50,000')).toBeInTheDocument()
  })

  it('renders with variant styles', () => {
    const { container } = render(
      <MetricCardComponent
        label="Active Users"
        value="1,200"
        variant="primary"
      />
    )

    // Check for primary class
    expect(container.firstChild).toHaveClass('bg-blue-500')
  })

  it('handles action click', () => {
    const handleAction = jest.fn()
    render(
      <MetricCardComponent
        label="Clickable"
        value={10}
        action={{ label: 'View Details', handler: handleAction }}
      />
    )

    fireEvent.click(screen.getByText('View Details'))
    expect(handleAction).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    const { container } = render(
      <MetricCardComponent
        label="Loading..."
        value={0}
        loading={true}
      />
    )

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
