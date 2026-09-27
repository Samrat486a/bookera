import type { ReactNode } from 'react'
import { cx } from '../../lib/format'

export function EbookGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>{children}</div>
}
