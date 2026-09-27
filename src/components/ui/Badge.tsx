import type { ReactNode } from 'react'
import { cx } from '../../lib/format'

type Tone = 'neutral' | 'indigo' | 'saffron' | 'coral' | 'leaf' | 'dark' | 'outline'

const tones: Record<Tone, string> = {
  neutral: 'bg-paper-2 text-ink-2',
  indigo: 'bg-indigo-50 text-indigo-600',
  saffron: 'bg-saffron-50 text-saffron-700',
  coral: 'bg-coral-50 text-coral-700',
  leaf: 'bg-leaf-50 text-leaf',
  dark: 'bg-ink text-paper',
  outline: 'border border-line-2 bg-white text-ink-2',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
  dot,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
  dot?: boolean
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold tracking-[0.06em] whitespace-nowrap uppercase',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}
