import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
}

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timeoutsRef.current[id]
    if (t) {
      clearTimeout(t)
      delete timeoutsRef.current[id]
    }
  }, [])

  const showToast = useCallback((opts: ToastOptions) => {
    const id = Date.now() + Math.floor(Math.random() * 10000)
    const variant: ToastVariant = opts.variant ?? 'info'
    const durationMs = opts.durationMs ?? 2500

    setToasts((prev) => [{ id, title: opts.title, description: opts.description, variant }, ...prev].slice(0, 3))

    timeoutsRef.current[id] = setTimeout(() => {
      dismissToast(id)
    }, durationMs)
  }, [dismissToast])

  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout)
      timeoutsRef.current = {}
    }
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast viewport */}
      {toasts.length > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none"
          style={{ top: 'calc(env(safe-area-inset-top, 60px) + 12px)' }}
          aria-live="polite"
          aria-atomic="true"
        >
          {toasts.map((t) => {
            const accent =
              t.variant === 'success'
                ? 'border-yellow-500/30 shadow-yellow-500/10'
                : t.variant === 'error'
                  ? 'border-red-500/30 shadow-red-500/10'
                  : 'border-white/10 shadow-white/5'

            const iconBg =
              t.variant === 'success'
                ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500]'
                : t.variant === 'error'
                  ? 'bg-gradient-to-b from-red-500 to-red-700'
                  : 'bg-zinc-800'

            const iconText =
              t.variant === 'success'
                ? '✓'
                : t.variant === 'error'
                  ? '×'
                  : 'i'

            return (
              <div
                key={t.id}
                className={`w-[min(92vw,420px)] px-4 py-3 bg-zinc-900/95 backdrop-blur-md border rounded-2xl shadow-lg ${accent} pointer-events-auto`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                    <span className="text-black text-lg font-bold">{iconText}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-snug">{t.title}</p>
                    {t.description && (
                      <p className="text-white/60 text-xs mt-0.5 leading-snug">{t.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(t.id)}
                    className="text-white/40 hover:text-white/70 transition-colors -mt-1"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}





