import type { MouseEvent } from 'react'
import { cx } from '../../lib/format'

/** Mouse handler that stores the cursor position on the hovered card (--mx / --my). */
export const trackSpotlight = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

/**
 * Soft radial light that follows the cursor inside a `group` card.
 * Place as the first child of a `relative isolate overflow-hidden group` element
 * that has `onMouseMove={trackSpotlight}`.
 */
export function Spotlight({ color = '#3654FF', size = 340, strength = 12, className }: { color?: string; size?: number; strength?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100', className)}
      style={{
        background: `radial-gradient(${size}px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, ${color} ${strength}%, transparent), transparent 65%)`,
      }}
    />
  )
}
