import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '../../lib/format'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Hide the visual title (still announced to screen readers). */
  hideTitle?: boolean
  /** Occupy the whole screen on small viewports. */
  fullscreenOnMobile?: boolean
  icon?: ReactNode
}

const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md', hideTitle, fullscreenOnMobile, icon }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])
    // Focus the first meaningful control (skip the close button when possible).
    const first = focusables().find((el) => !el.dataset.close) ?? focusables()[0]
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab') {
        const els = focusables()
        if (!els.length) return
        const [f, l] = [els[0]!, els[els.length - 1]!]
        if (e.shiftKey && document.activeElement === f) {
          e.preventDefault()
          l.focus()
        } else if (!e.shiftKey && document.activeElement === l) {
          e.preventDefault()
          f.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={cx('fixed inset-0 z-[70] flex justify-center', fullscreenOnMobile ? 'items-stretch sm:items-center sm:p-6' : 'items-end p-0 sm:items-center sm:p-6')}>
      <div className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cx(
          'relative flex w-full animate-pop-in flex-col overflow-hidden bg-white shadow-lift',
          fullscreenOnMobile ? 'h-dvh max-h-dvh sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl' : 'max-h-[92dvh] rounded-t-3xl sm:rounded-3xl',
          sizes[size],
        )}
      >
        <button
          data-close="true"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full text-muted transition hover:bg-paper hover:text-ink"
          aria-label="Close dialog"
        >
          <X className="size-5" />
        </button>
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {icon && <div className="mb-5">{icon}</div>}
          {title && (
            <h2 id={titleId} className={cx('pr-8 text-2xl font-bold text-ink', hideTitle && 'sr-only')}>
              {title}
            </h2>
          )}
          {description && (
            <div id={descId} className="mt-2 text-[15px] leading-relaxed text-muted">
              {description}
            </div>
          )}
          {children && <div className={cx(title || description ? 'mt-6' : '')}>{children}</div>}
        </div>
        {footer && <div className="flex flex-col-reverse gap-3 border-t border-line bg-paper/60 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Small reusable confirm dialog for destructive / state-changing actions. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'dark'
  icon?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      icon={icon}
      footer={
        <>
          <button onClick={onClose} className="h-11 rounded-full border border-line-2 bg-white px-5 text-sm font-semibold text-ink transition hover:border-ink/40">
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={cx(
              'h-11 rounded-full px-5 text-sm font-semibold text-white transition',
              tone === 'danger' ? 'bg-coral hover:bg-coral-700' : 'bg-ink hover:bg-ink-2',
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  )
}
