import { Component, CSSProperties, ReactNode } from 'react'

export interface BaseComponentProps {
  id?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
  'aria-label'?: string
  role?: string
}

export interface BaseComponentState {
  hasError: boolean
  error?: Error
}

/**
 * Base abstract class for all UI library components.
 * Provides common functionality like error boundary, id management, and prop typing.
 */
export abstract class BaseComponent<
  P extends BaseComponentProps = BaseComponentProps, 
  S extends BaseComponentState = BaseComponentState
> extends Component<P, S> {
  
  constructor(props: P) {
    super(props)
    this.state = {
      hasError: false
    } as S
  }

  static getDerivedStateFromError(error: Error): BaseComponentState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component Error:', error, errorInfo)
  }

  protected getBaseClassName(): string {
    return this.props.className || ''
  }

  protected renderError() {
    return (
      <div className="p-4 border border-red-500 bg-red-50 text-red-700 rounded-md">
        <h3 className="font-bold">Something went wrong</h3>
        <p className="text-sm">{this.state.error?.message}</p>
      </div>
    )
  }

  abstract renderContent(): ReactNode

  render() {
    if (this.state.hasError) {
      return this.renderError()
    }

    return this.renderContent()
  }
}
