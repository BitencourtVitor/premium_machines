import React, { ReactNode } from 'react'
import { BaseComponent, BaseComponentProps } from '../base/BaseComponent'
import { Icon } from '../design-system/Icon'

export interface MetricCardProps extends BaseComponentProps {
  label: string
  value: string | number
  variant?: 'primary' | 'secondary' | 'tertiary' | 'neutral'
  icon?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  action?: {
    label: string
    handler: () => void
    icon?: string
  }
  loading?: boolean
}

export class MetricCardComponent extends BaseComponent<MetricCardProps> {
  private getVariantClasses(): string {
    const { variant = 'neutral' } = this.props
    
    switch (variant) {
      case 'primary':
        return 'bg-blue-500 text-white border-blue-600'
      case 'secondary':
        return 'bg-purple-500 text-white border-purple-600'
      case 'tertiary':
        return 'bg-emerald-500 text-white border-emerald-600'
      case 'neutral':
      default:
        return 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700'
    }
  }

  private getTextClasses(): string {
    const { variant = 'neutral' } = this.props
    return variant === 'neutral' ? 'text-gray-500 dark:text-gray-400' : 'text-blue-100'
  }

  private getValueClasses(): string {
    const { variant = 'neutral' } = this.props
    return variant === 'neutral' ? 'text-gray-900 dark:text-white' : 'text-white'
  }

  renderContent(): ReactNode {
    const { label, value, icon, action, loading, trend, className } = this.props
    const variantClasses = this.getVariantClasses()
    const textClasses = this.getTextClasses()
    const valueClasses = this.getValueClasses()

    return (
      <div 
        className={`
          relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all hover:shadow-md
          ${variantClasses}
          ${this.getBaseClassName()}
        `}
      >
        {loading ? (
           <div className="animate-pulse flex space-x-4">
             <div className="flex-1 space-y-4 py-1">
               <div className="h-4 bg-gray-200 rounded w-3/4"></div>
               <div className="h-8 bg-gray-200 rounded"></div>
             </div>
           </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${textClasses}`}>{label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${valueClasses}`}>{value}</span>
                  {trend && (
                    <span className={`text-sm font-medium ${
                      trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 
                      trend.direction === 'down' ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-500'
                    }`}>
                      {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} 
                      {Math.abs(trend.value)}%
                      {trend.label && <span className="text-xs ml-1 opacity-75">{trend.label}</span>}
                    </span>
                  )}
                </div>
              </div>
              {icon && (
                <div className={`p-3 rounded-lg ${
                  this.props.variant && this.props.variant !== 'neutral' 
                    ? 'bg-white/20' 
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                }`}>
                  <Icon name={icon} size={24} />
                </div>
              )}
            </div>

            {action && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <button
                  onClick={action.handler}
                  className={`text-sm font-medium hover:underline flex items-center gap-1 ${
                    this.props.variant && this.props.variant !== 'neutral' ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {action.label}
                  {action.icon && <Icon name={action.icon} size={12} />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }
}
