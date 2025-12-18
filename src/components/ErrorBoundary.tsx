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
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.state.error?.message || 'Unknown error'
      const isConnectionError = 
        errorMessage.includes('Load failed') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('TypeError') ||
        errorMessage.includes('network')

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white p-4">
          <div className="text-red-400 text-xl text-center mb-4">
            {isConnectionError ? (
              <>
                <div className="mb-2">⚠️ Ошибка подключения</div>
                <div className="text-sm text-gray-400 mt-4">
                  Приложение работает в режиме офлайн.<br/>
                  Используются тестовые данные.
                </div>
              </>
            ) : (
              <>
                <div className="mb-2">⚠️ Произошла ошибка</div>
                <div className="text-sm text-gray-400 mt-4">
                  {errorMessage}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-yellow-500 text-black rounded-lg font-bold"
          >
            Перезагрузить
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

