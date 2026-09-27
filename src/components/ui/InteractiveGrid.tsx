import type { CSSProperties } from 'react'
import { lightMask, usePointerLight } from '../../lib/pointer'
import { cx } from '../../lib/format'

/** A light window: moved with GPU transforms only (see usePointerLight). */
const windowStyle = (size: number, softness?: number): CSSProperties => ({
  width: size,
  height: size,
  opacity: 0,
  willChange: 'transform, opacity',
  maskImage: lightMask(softness),
  WebkitMaskImage: lightMask(softness),
})
const innerStyle: CSSProperties = { willChange: 'transform' }

/**
 * The site's background grid.
 *  • At rest: a fine 32px grid, stronger lines every 128px and small “+” marks
 *    at the major crossings — all static, painted once.
 *  • On hover: grid lines near the cursor light up indigo with glowing crossing
 *    points, the centre warms to saffron, and a soft ambient light follows —
 *    moved purely with GPU transforms, so scrolling and hovering stay smooth.
 * Pass mask classes (e.g. a fade) through `className`.
 */
export function InteractiveGrid({ className }: { className?: string }) {
  const ref = usePointerLight<HTMLDivElement>()
  return (
    <div ref={ref} className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {/* resting grid */}
      <div className="bg-grid absolute inset-0" />
      <div className="bg-grid-major absolute inset-0" />
      <div className="bg-grid-cross absolute inset-0" />

      {/* soft ambient light (no artwork inside, just a gradient) */}
      <div
        data-light="880"
        className="absolute top-0 left-0 rounded-full"
        style={{
          width: 880,
          height: 880,
          opacity: 0,
          willChange: 'transform, opacity',
          background: 'radial-gradient(closest-side, rgb(54 84 255 / 0.08), rgb(255 174 31 / 0.04) 55%, transparent 100%)',
        }}
      />
      {/* lit indigo lines + glowing crossings */}
      <div data-light="520" className="absolute top-0 left-0 overflow-hidden" style={windowStyle(520, 0.45)}>
        <div className="absolute top-0 left-0" style={innerStyle}>
          <div className="bg-grid-glow absolute inset-0" />
          <div className="bg-grid-nodes absolute inset-0" />
        </div>
      </div>
      {/* warm saffron core */}
      <div data-light="190" className="absolute top-0 left-0 overflow-hidden" style={windowStyle(190, 0.6)}>
        <div className="absolute top-0 left-0" style={innerStyle}>
          <div className="bg-grid-warm absolute inset-0" />
        </div>
      </div>
    </div>
  )
}
