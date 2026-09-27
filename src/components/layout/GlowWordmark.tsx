import type { CSSProperties } from 'react'
import { lightMask, usePointerLight } from '../../lib/pointer'

/**
 * Full-width footer wordmark, Resend-style: dark letters resting on a horizon
 * line. A small light trails the cursor, lifting the letters and tracing their
 * edges with a soft glowing outline.
 *
 * Performance: the glowing copies are painted once and revealed through small
 * "light windows" that move with GPU transforms (see usePointerLight), so
 * hovering never triggers a repaint of the large text.
 *
 * Sizing uses container-query units so the word always spans the container.
 */
const FONT = 25.6 // cqw — "bookera." spans ~3.9em in Space Grotesk bold with -0.05em tracking
const VISIBLE = 0.8 // show the top 80% of the line box; the base sinks below the horizon

const word = 'block font-display leading-none font-bold tracking-[-0.05em] whitespace-nowrap select-none'
const windowStyle = (size: number, softness: number): CSSProperties => ({
  width: size,
  height: size,
  opacity: 0,
  willChange: 'transform, opacity',
  maskImage: lightMask(softness),
  WebkitMaskImage: lightMask(softness),
})

/** The wordmark + horizon, drawn in a given style. Rendered once as the base and once per light. */
function Mark({ letters, line }: { letters: string; line: string }) {
  return (
    <>
      <div className="relative overflow-hidden" style={{ height: `${FONT * VISIBLE}cqw` }}>
        <span className={`${word} ${letters}`} style={{ fontSize: `${FONT}cqw` }}>
          bookera.
        </span>
      </div>
      <div className={`h-px ${line}`} />
    </>
  )
}

export function GlowWordmark() {
  const ref = usePointerLight<HTMLDivElement>({ ease: 0.1, fade: 0.07, pad: 24 })

  return (
    <div ref={ref} className="@container relative mt-16 overflow-hidden" aria-hidden>
      {/* base — unchanged look */}
      <Mark letters="text-paper/[0.07]" line="bg-paper/15" />
      {/* faint floor reflection */}
      <div className="h-14 bg-linear-to-b from-paper/[0.04] to-transparent sm:h-20" />

      {/* letters lift slightly near the light */}
      <div data-light="340" className="pointer-events-none absolute top-0 left-0 overflow-hidden" style={windowStyle(340, 0.55)}>
        <div className="absolute top-0 left-0" style={{ willChange: 'transform' }}>
          <Mark letters="text-paper/[0.13]" line="bg-transparent" />
        </div>
      </div>

      {/* glowing outline + lit horizon, tight around the cursor */}
      <div data-light="220" className="pointer-events-none absolute top-0 left-0 overflow-hidden" style={windowStyle(220, 0.5)}>
        <div className="absolute top-0 left-0" style={{ willChange: 'transform' }}>
          <Mark
            letters="text-transparent [-webkit-text-stroke:1.25px_rgb(246_244_238/0.95)] [text-shadow:0_0_14px_rgb(255_255_255/0.35)]"
            line="bg-paper/85 shadow-[0_0_8px_rgb(255_255_255/0.7)]"
          />
        </div>
      </div>
    </div>
  )
}
