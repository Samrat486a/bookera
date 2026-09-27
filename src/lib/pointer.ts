import { useEffect, useRef } from 'react'

/**
 * Cursor-following light, built for smoothness.
 *
 * Inside the root element, any child marked `data-light` is a "light window":
 * a small, fixed-size element with a static radial mask. Each frame we only
 * update CSS transforms (and opacity):
 *   • the window is translated to sit under the cursor, and
 *   • its first child (a copy of the full-size artwork) is translated the
 *     opposite way so the artwork stays aligned with the page.
 * Transforms and opacity are handled by the GPU compositor, so nothing is
 * repainted while the mouse moves.
 *
 * Extra rules to stay cheap:
 *   • listens only while the root is visible (IntersectionObserver)
 *   • never measures layout per frame — the root's position is cached and
 *     refreshed on scroll/resize
 *   • stops its animation loop as soon as the light has settled
 *   • does nothing on touch-only devices or with reduced motion
 */
export function usePointerLight<T extends HTMLElement>({ ease = 0.14, fade = 0.08, pad = 0 } = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia?.('(hover: none)').matches || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const lights = Array.from(root.querySelectorAll<HTMLElement>('[data-light]')).map((el) => ({
      el,
      inner: el.firstElementChild as HTMLElement | null,
      half: Number(el.dataset.light || 0) / 2,
    }))
    if (!lights.length) return

    let rect = root.getBoundingClientRect()
    let cx = -1e5
    let cy = -1e5
    let x = 0
    let y = 0
    let o = 0
    let placed = false
    let raf = 0
    let visible = false

    // Keep full-size artwork copies matched to the root size.
    const sizeInner = () => {
      rect = root.getBoundingClientRect()
      for (const l of lights) {
        if (!l.inner) continue
        l.inner.style.width = `${root.offsetWidth}px`
        l.inner.style.height = `${root.offsetHeight}px`
      }
    }
    sizeInner()
    const ro = new ResizeObserver(sizeInner)
    ro.observe(root)

    const apply = () => {
      for (const l of lights) {
        const tx = x - l.half
        const ty = y - l.half
        l.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
        l.el.style.opacity = o.toFixed(3)
        if (l.inner) l.inner.style.transform = `translate3d(${-tx}px, ${-ty}px, 0)`
      }
    }

    const tick = () => {
      raf = 0
      const inside = cx >= rect.left - pad && cx <= rect.right + pad && cy >= rect.top - pad && cy <= rect.bottom + pad
      const tx = cx - rect.left
      const ty = cy - rect.top
      if (!placed && inside) {
        x = tx
        y = ty
        placed = true
      }
      if (placed) {
        x += (tx - x) * ease
        y += (ty - y) * ease
      }
      o += ((inside ? 1 : 0) - o) * fade
      const settled = inside ? Math.abs(tx - x) < 0.3 && Math.abs(ty - y) < 0.3 && o > 0.995 : o < 0.004
      if (!inside && o < 0.004) {
        o = 0
        placed = false
      }
      apply()
      if (!settled) raf = requestAnimationFrame(tick)
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onMove = (e: PointerEvent) => {
      cx = e.clientX
      cy = e.clientY
      kick()
    }
    const onScroll = () => {
      rect = root.getBoundingClientRect()
      kick()
    }
    const onLeave = () => {
      cx = cy = -1e5
      kick()
    }

    const listen = (on: boolean) => {
      if (on === visible) return
      visible = on
      const m = on ? 'addEventListener' : 'removeEventListener'
      window[m]('pointermove', onMove as EventListener, { passive: true } as AddEventListenerOptions)
      window[m]('scroll', onScroll, { passive: true } as AddEventListenerOptions)
      document.documentElement[m]('pointerleave', onLeave)
      if (!on) onLeave()
      else rect = root.getBoundingClientRect()
    }
    const io = new IntersectionObserver(([entry]) => listen(!!entry?.isIntersecting), { rootMargin: '100px' })
    io.observe(root)

    return () => {
      io.disconnect()
      ro.disconnect()
      listen(false)
      cancelAnimationFrame(raf)
    }
  }, [ease, fade, pad])

  return ref
}

/** Radial mask for a light window of the given diameter. */
export const lightMask = (softness = 0.5) =>
  `radial-gradient(closest-side, black 0%, rgb(0 0 0 / ${softness}) 45%, transparent 100%)`
