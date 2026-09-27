import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cx } from '../lib/format'

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  title: string
  description?: string
  tone: Tone
}

type ToastFn = (t: { title: string; description?: string; tone?: Tone }) => void
const ToastContext = createContext<ToastFn>(() => {})

const icons = {
  success: <CheckCircle2 className="size-5 text-leaf" aria-hidden />,
  error: <AlertTriangle className="size-5 text-coral" aria-hidden />,
  info: <Info className="size-5 text-indigo" aria-hidden />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])

  const toast = useCallback<ToastFn>(
    ({ title, description, tone = 'success' }) => {
      const id = nextId.current++
      setToasts((ts) => [...ts.slice(-2), { id, title, description, tone }])
      window.setTimeout(() => dismiss(id), 3800)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              'pointer-events-auto flex w-full max-w-sm animate-pop-in items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-lift',
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="-m-1 rounded-lg p-1 text-muted transition hover:bg-paper hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
