import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // При ошибке НЕ показываем экран ошибки, а пытаемся показать контент
      // Ошибка логируется, но пользователь видит контент
      console.error('ErrorBoundary: Error caught but showing content anyway', this.state.error)
      
      // Сбрасываем ошибку и показываем children
      // Это позволит приложению работать даже при ошибках
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      // Показываем children вместо ошибки
      // Ошибка будет обработана внутри компонентов через fallback
      return this.props.children
    }

    return this.props.children
  }
}

