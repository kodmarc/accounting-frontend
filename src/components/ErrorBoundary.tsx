import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 shadow-sm text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-6">
              An unexpected error occurred. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#0F5B38] text-white text-sm font-medium px-5 py-2 rounded-[3px] hover:brightness-105 transition cursor-pointer"
            >
              Refresh Page
            </button>
            {import.meta.env.DEV && (
              <pre className="mt-6 text-left text-xs bg-slate-50 border border-slate-200 rounded p-3 text-red-600 overflow-auto max-h-40">
                {this.state.message}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
