import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useCountUp, useInView } from '../../lib/hooks'
import { cx } from '../../lib/format'

type Tone = 'ink' | 'indigo' | 'saffron' | 'coral' | 'leaf'

const toneClass: Record<Tone, string> = {
  ink: 'bg-ink text-paper',
  indigo: 'bg-indigo text-white',
  saffron: 'bg-saffron text-ink',
  coral: 'bg-coral text-white',
  leaf: 'bg-leaf text-white',
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'ink',
  hint,
  format,
  className,
  style,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone?: Tone
  hint?: ReactNode
  format?: (n: number) => string
  className?: string
  style?: CSSProperties
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  const n = useCountUp(value, inView, 900)
  return (
    <div ref={ref} className={cx('rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6', className)} style={style}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', toneClass[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] tabular-nums sm:text-[2.6rem]">{format ? format(n) : n.toLocaleString('en-IN')}</p>
      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
    </div>
  )
}

export function Panel({ title, description, action, children, className, id }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx('min-w-0 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6', className)} aria-label={title}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
