'use client';
import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

function DefaultErrorFallback({ error, onReset }: { error?: Error; onReset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <div className="bg-white rounded-2xl p-8 max-w-sm mx-auto shadow-sm text-center">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
          <path d="M24 4L44 40H4L24 4Z" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round" />
          <rect x="22" y="18" width="4" height="12" rx="2" fill="#F59E0B" />
          <circle cx="24" cy="34" r="2" fill="#F59E0B" />
        </svg>
        <h2 className="text-lg font-extrabold text-stone-800 mb-2">Algo salió mal</h2>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          {error?.message ? error.message.slice(0, 100) : 'Ocurrió un error inesperado.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-bold rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: { componentStack: string }) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

export { DefaultErrorFallback };
