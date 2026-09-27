import type { ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import { cx } from '../../lib/format'
import { Button } from './Button'

/** Abstract "open book with scattered pages" illustration used for empty states. */
export function EmptyIllustration({ variant = 'books' }: { variant?: 'books' | 'search' | 'error' }) {
  return (
    <svg viewBox="0 0 220 150" className="h-auto w-48 sm:w-56" aria-hidden>
      <defs>
        <pattern id="es-dots" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#14171B" opacity="0.14" />
        </pattern>
      </defs>
      <rect x="10" y="10" width="200" height="130" rx="20" fill="url(#es-dots)" />
      {variant === 'error' ? (
        <>
          <rect x="62" y="36" width="96" height="78" rx="10" fill="#fff" stroke="#14171B" strokeWidth="2" />
          <path d="M62 52h96" stroke="#14171B" strokeWidth="2" />
          <circle cx="72" cy="44" r="2.5" fill="#FF5D5D" />
          <circle cx="80" cy="44" r="2.5" fill="#FFAE1F" />
          <path d="M100 74l20 20M120 74l-20 20" stroke="#FF5D5D" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <g transform="rotate(-10 70 80)">
            <rect x="46" y="38" width="48" height="70" rx="6" fill="#3654FF" />
            <rect x="54" y="50" width="26" height="4" rx="2" fill="#fff" opacity="0.9" />
            <rect x="54" y="58" width="18" height="4" rx="2" fill="#fff" opacity="0.6" />
          </g>
          <g transform="rotate(8 150 80)">
            <rect x="126" y="40" width="48" height="70" rx="6" fill="#FFAE1F" />
            <circle cx="150" cy="70" r="12" fill="none" stroke="#14171B" strokeWidth="2" />
          </g>
          <path d="M80 112c10-8 20-8 30 0 10-8 20-8 30 0v12c-10-8-20-8-30 0-10-8-20-8-30 0z" fill="#fff" stroke="#14171B" strokeWidth="2" strokeLinejoin="round" />
          <path d="M110 112v12" stroke="#14171B" strokeWidth="2" />
          {variant === 'search' ? (
            <g>
              <circle cx="110" cy="62" r="18" fill="#fff" stroke="#14171B" strokeWidth="3" />
              <path d="M123 75l12 12" stroke="#14171B" strokeWidth="4" strokeLinecap="round" />
              <path d="M104 62h12" stroke="#FF5D5D" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <path d="M110 44l3.5 7 7.5 1-5.5 5.3 1.3 7.7-6.8-3.6-6.8 3.6 1.3-7.7-5.5-5.3 7.5-1z" fill="#FF5D5D" />
            </g>
          )}
        </>
      )}
    </svg>
  )
}

export function EmptyState({
  title,
  description,
  action,
  variant = 'books',
  className,
}: {
  title: string
  description: string
  action?: ReactNode
  variant?: 'books' | 'search' | 'error'
  className?: string
}) {
  return (
    <div className={cx('flex animate-fade-up flex-col items-center rounded-3xl border border-dashed border-line-2 bg-white/60 px-6 py-14 text-center', className)}>
      <EmptyIllustration variant={variant} />
      <h3 className="mt-6 text-2xl font-bold">{title}</h3>
      <p className="mt-2 max-w-sm text-[15px] text-muted">{description}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description="Please try again."
      action={
        <Button variant="dark" onClick={onRetry}>
          <RotateCw className="size-4" /> Retry
        </Button>
      }
    />
  )
}

export function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white" aria-hidden>
      <div className="skeleton aspect-[4/3.3]" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="skeleton h-6 w-4/5 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded-lg" />
        <div className="skeleton h-4 w-full rounded-lg" />
        <div className="flex justify-between pt-2">
          <div className="skeleton h-4 w-24 rounded-lg" />
          <div className="skeleton h-4 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function ProgressBar({ value, className, tone = 'indigo' }: { value: number; className?: string; tone?: 'indigo' | 'leaf' | 'saffron' }) {
  const color = value >= 100 ? 'bg-leaf' : tone === 'saffron' ? 'bg-saffron' : tone === 'leaf' ? 'bg-leaf' : 'bg-indigo'
  return (
    <div
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-paper-2', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', color)} style={{ width: `${value}%` }} />
    </div>
  )
}

export function Rating({ value, reviews, className }: { value: number; reviews?: number; className?: string }) {
  if (!value) return <span className={cx('text-sm text-muted', className)}>No ratings yet</span>
  return (
    <span className={cx('inline-flex items-center gap-1 text-sm font-semibold text-ink', className)}>
      <svg viewBox="0 0 20 20" className="size-4 fill-saffron" aria-hidden>
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
      </svg>
      <span aria-label={`Rated ${value} out of 5`}>{value.toFixed(1)}</span>
      {reviews !== undefined && <span className="font-normal text-muted">({reviews.toLocaleString('en-IN')})</span>}
    </span>
  )
}

export function Avatar({ name, tone, size = 'md', className }: { name: string; tone: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const parts = name.split(' ')
  const text = (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase()
  const dims = { sm: 'size-9 text-xs', md: 'size-12 text-sm', lg: 'size-16 text-lg', xl: 'size-24 text-2xl' }[size]
  const hex = tone.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const light = (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255 > 0.62
  return (
    <span
      className={cx('relative grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-bold', dims, light ? 'text-ink' : 'text-white', className)}
      style={{ background: tone }}
      role="img"
      aria-label={`${name} avatar`}
    >
      <span className="absolute inset-0 bg-dots-light opacity-60" aria-hidden />
      <span className="relative">{text}</span>
    </span>
  )
}
