import React, { ReactNode } from 'react'
import { BaseComponent, BaseComponentProps, BaseComponentState } from '../base/BaseComponent'
import { Icon } from '../design-system/Icon'

export interface ActionButton {
  label: string
  icon?: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

export interface SortOption {
  label: string
  value: string
}

export interface ListingPagination {
  current: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export interface ListingComponentProps<T> extends BaseComponentProps {
  title: string
  items: T[]
  loading?: boolean
  actions?: ActionButton[]
  pagination?: ListingPagination
  sortOptions?: SortOption[]
  activeSort?: string
  onSortChange?: (value: string) => void
  renderItem: (item: T, index: number) => ReactNode
  emptyMessage?: string
}

interface ListingComponentState extends BaseComponentState {
  isFilterOpen: boolean
}

export class ListingComponent<T> extends BaseComponent<ListingComponentProps<T>, ListingComponentState> {
  constructor(props: ListingComponentProps<T>) {
    super(props)
    this.state = {
      ...this.state,
      isFilterOpen: false
    }
  }

  private toggleFilter = () => {
    this.setState(prev => ({ isFilterOpen: !prev.isFilterOpen }))
  }

  private renderHeader() {
    const { title, actions, sortOptions, activeSort, onSortChange } = this.props

    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {sortOptions && sortOptions.length > 0 && (
            <div className="relative">
              <select
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 pl-4 pr-8 rounded-lg leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={activeSort}
                onChange={(e) => onSortChange?.(e.target.value)}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-200">
                <Icon name="sort" size={12} />
              </div>
            </div>
          )}

          {actions?.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${action.variant === 'primary' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : action.variant === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              {action.icon && <Icon name={action.icon} />}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  private renderPagination() {
    const { pagination } = this.props
    if (!pagination || pagination.total <= 0) return null

    const { current, total, pageSize, onPageChange } = pagination
    const totalPages = Math.ceil(total / pageSize)

    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 mt-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(current - 1)}
            disabled={current === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(current + 1)}
            disabled={current === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{(current - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(current * pageSize, total)}</span> of <span className="font-medium">{total}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => onPageChange(current - 1)}
                disabled={current === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <Icon name="chevron-left" size={16} />
              </button>
              
              {/* Simple page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 5) {
                   if (current > 3) pageNum = current - 2 + i
                   if (pageNum > totalPages) pageNum = pageNum - (pageNum - totalPages)
                }
                
                // Adjustment logic for simple sliding window is complex, keeping it simple for now
                // or just showing current
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                      ${current === pageNum
                        ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-200'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => onPageChange(current + 1)}
                disabled={current === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <Icon name="chevron-right" size={16} />
              </button>
            </nav>
          </div>
        </div>
      </div>
    )
  }

  renderContent(): ReactNode {
    const { items, loading, renderItem, emptyMessage, className } = this.props
    
    return (
      <div className={`w-full ${this.getBaseClassName()}`}>
        {this.renderHeader()}
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <Icon name="search" className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No items found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{emptyMessage || 'Try adjusting your search or filters.'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item, index) => (
              <div key={index}>
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        )}

        {this.renderPagination()}
      </div>
    )
  }
}
