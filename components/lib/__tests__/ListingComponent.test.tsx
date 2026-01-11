import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ListingComponent } from '../listing/ListingComponent'

describe('ListingComponent', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ]

  const mockRenderItem = (item: typeof mockItems[0]) => (
    <div data-testid="item">{item.name}</div>
  )

  it('renders title and items correctly', () => {
    render(
      <ListingComponent
        title="Test List"
        items={mockItems}
        renderItem={mockRenderItem}
      />
    )

    expect(screen.getByText('Test List')).toBeInTheDocument()
    expect(screen.getAllByTestId('item')).toHaveLength(2)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('shows empty message when items array is empty', () => {
    render(
      <ListingComponent
        title="Empty List"
        items={[]}
        renderItem={mockRenderItem}
        emptyMessage="No items here"
      />
    )

    expect(screen.getByText('No items here')).toBeInTheDocument()
  })

  it('handles pagination clicks', () => {
    const onPageChange = jest.fn()
    const pagination = {
      current: 1,
      total: 20,
      pageSize: 10,
      onPageChange
    }

    render(
      <ListingComponent
        title="Paged List"
        items={mockItems}
        renderItem={mockRenderItem}
        pagination={pagination}
      />
    )

    // Find next button (chevron-right) or text if accessible
    // Assuming implementation uses buttons
    const buttons = screen.getAllByRole('button')
    // The implementation might have multiple buttons, need to be specific if possible
    // But for this template, we just verify interaction
    
    // In our implementation: Previous, 1, 2, Next
    fireEvent.click(screen.getByText('2'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('renders actions correctly', () => {
    const actionClick = jest.fn()
    const actions = [
      { label: 'Add New', onClick: actionClick, variant: 'primary' as const }
    ]

    render(
      <ListingComponent
        title="Action List"
        items={mockItems}
        renderItem={mockRenderItem}
        actions={actions}
      />
    )

    const button = screen.getByText('Add New')
    fireEvent.click(button)
    expect(actionClick).toHaveBeenCalled()
  })
})
