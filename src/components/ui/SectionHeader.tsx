import type { ReactNode } from 'react'
import { cx } from '../../lib/format'

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  className,
  as: Tag = 'h2',
}: {
  eyebrow?: string
  title: ReactNode
  description?: string
  action?: ReactNode
  align?: 'left' | 'center'
  className?: string
  as?: 'h1' | 'h2'
}) {
  return (
    <div className={cx('flex flex-col gap-6', align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between', className)}>
      <div className={cx('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p className="eyebrow">
            <span className="h-px w-6 bg-ink/30" aria-hidden />
            {eyebrow}
          </p>
        )}
        <Tag className="mt-3 text-[2rem] leading-[1.05] font-bold sm:text-5xl">{title}</Tag>
        {description && <p className="mt-4 text-[17px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
