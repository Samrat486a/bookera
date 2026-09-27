import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import {
  ArrowLeft,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  MoveHorizontal,
  Plus,
  ShoppingBag,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { getAuthor } from '../data/authors'
import { LIVE, api } from '../lib/api'
import { downloadBookPdf, loadBookPdf } from '../lib/pdf/bookPdf'
import { cx } from '../lib/format'
import { RequireRole } from '../components/layout/Layouts'
import { BookCover } from '../components/ebooks/BookCover'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/States'

type Theme = 'light' | 'sepia' | 'night'
type Zoom = 'fit-page' | 'fit-width' | number

const themes: Record<Theme, { label: string; stage: string; filter: string; swatch: string }> = {
  light: { label: 'Light', stage: 'bg-paper-2', filter: 'none', swatch: '#FFFFFF' },
  sepia: { label: 'Sepia', stage: 'bg-[#EADFC8]', filter: 'sepia(0.35) saturate(1.1) brightness(0.97)', swatch: '#F3E7CF' },
  night: { label: 'Night', stage: 'bg-[#0E1013]', filter: 'invert(0.9) hue-rotate(180deg) brightness(0.95)', swatch: '#1B1E23' },
}

const THEME_KEY = 'bookera:reader-theme'

function ToolButton({ label, onClick, disabled, children, active }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cx(
        'grid size-10 shrink-0 place-items-center rounded-full transition duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-30',
        active ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/[0.06]',
      )}
    >
      {children}
    </button>
  )
}

function ReaderView({ bookId }: { bookId: string }) {
  const { getBook, getEntry, setProgress, catalogReady } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const book = getBook(bookId)
  const entry = getEntry(bookId)

  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTask = useRef<RenderTask | null>(null)
  const saveTimer = useRef<number>(0)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [page, setPage] = useState(() => Math.max(1, entry?.lastPage ?? 1))
  const [pageInput, setPageInput] = useState(String(page))
  const [zoom, setZoom] = useState<Zoom>(() => (window.innerWidth < 768 ? 'fit-width' : 'fit-page'))
  const [scaleShown, setScaleShown] = useState(1)
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as Theme) || 'light'
    } catch {
      return 'light'
    }
  })
  const [fullscreen, setFullscreen] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [flip, setFlip] = useState<'next' | 'prev' | null>(null)
  const [downloading, setDownloading] = useState(false)
  const total = doc?.numPages ?? 0

  /* Load the PDF + pdf.js lazily (kept out of the main bundle). */
  useEffect(() => {
    if (!book) return
    let cancelled = false
    let task: { destroy: () => Promise<void> } | null = null
    ;(async () => {
      try {
        const [pdfjs, worker, bytes] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'), loadBookPdf(book)])
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        const loading = pdfjs.getDocument({ data: bytes })
        task = loading
        const loaded = await loading.promise
        if (cancelled) return void loading.destroy()
        setDoc(loaded)
        setPage((p) => Math.min(Math.max(1, p), loaded.numPages))
        setStatus('ready')
        if ((entry?.lastPage ?? 1) > 1) toast({ title: `Welcome back — page ${entry!.lastPage}`, description: 'Picked up right where you left off.', tone: 'info' })
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'We couldn’t open this e-book.')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      task?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id])

  /* Render the current page. */
  const render = useCallback(async () => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!doc || !canvas || !stage) return
    renderTask.current?.cancel()
    setRendering(true)
    try {
      const pdfPage = await doc.getPage(page)
      const base = pdfPage.getViewport({ scale: 1 })
      const availW = Math.max(200, stage.clientWidth - (window.innerWidth < 640 ? 24 : 64))
      const availH = Math.max(200, stage.clientHeight - 48)
      const scale =
        zoom === 'fit-width' ? Math.min(availW / base.width, 3) : zoom === 'fit-page' ? Math.min(availW / base.width, availH / base.height) : zoom
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      const viewport = pdfPage.getViewport({ scale: scale * dpr })
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`
      const task = pdfPage.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport })
      renderTask.current = task
      await task.promise
      setScaleShown(scale)
    } catch (e) {
      if ((e as { name?: string })?.name !== 'RenderingCancelledException') console.warn(e)
    } finally {
      setRendering(false)
    }
  }, [doc, page, zoom])

  useEffect(() => {
    render()
  }, [render, fullscreen])
  useEffect(() => {
    const onResize = () => render()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [render])

  /* Remember progress (debounced to the server in live mode). */
  useEffect(() => {
    setPageInput(String(page))
    if (!total || !book) return
    const pct = Math.round((page / total) * 100)
    setProgress(book.id, pct, page)
    if (LIVE.commerce) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => api.saveProgress(book.id, pct, page).catch(() => {}), 800)
    }
  }, [page, total, book, setProgress])

  const go = useCallback(
    (target: number) => {
      if (!total) return
      const next = Math.min(total, Math.max(1, target))
      if (next === page) return
      setFlip(next > page ? 'next' : 'prev')
      setPage(next)
    },
    [page, total],
  )

  const zoomBy = (delta: number) => setZoom((z) => Math.min(3, Math.max(0.5, Math.round(((typeof z === 'number' ? z : scaleShown) + delta) * 10) / 10)))

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        go(page + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(page - 1)
      } else if (e.key === 'Home') go(1)
      else if (e.key === 'End') go(total)
      else if (e.key === '+' || e.key === '=') zoomBy(0.1)
      else if (e.key === '-') zoomBy(-0.1)
      else if (e.key === '0') setZoom('fit-page')
      else if (e.key.toLowerCase() === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const persistTheme = (t: Theme) => {
    setTheme(t)
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      /* ignore */
    }
  }

  /* Swipe to turn pages on touch screens */
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch') swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(page + (dx < 0 ? 1 : -1))
  }

  if (!book && !catalogReady) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-paper-2" role="status">
        <Loader2 className="size-6 animate-spin text-muted" aria-hidden />
      </div>
    )
  }
  if (!book) {
    return (
      <div className="container-page py-20">
        <EmptyState variant="search" title="E-book not found" description="It may have been removed from the catalogue." action={<ButtonLink to="/dashboard">My Library</ButtonLink>} />
      </div>
    )
  }
  if (!entry) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="This e-book isn’t in your library yet"
          description="Buy it once and read it online anytime — or download the PDF."
          action={
            <>
              <ButtonLink to={`/checkout/${book.id}`}>
                <ShoppingBag className="size-4" aria-hidden /> Get this e-book
              </ButtonLink>
              <ButtonLink to="/dashboard" variant="outline">
                My Library
              </ButtonLink>
            </>
          }
        />
      </div>
    )
  }

  const author = getAuthor(book.authorId)
  const pct = total ? Math.round((page / total) * 100) : 0
  const t = themes[theme]
  const dark = theme === 'night'

  return (
    <div className={cx('fixed inset-0 z-[60] flex flex-col transition-colors duration-500', t.stage)}>
      {/* Top bar */}
      <header className={cx('flex h-16 shrink-0 items-center gap-3 border-b px-3 sm:px-5', dark ? 'border-white/10 bg-[#15181D] text-paper' : 'border-line bg-paper')}>
        <button
          onClick={() => navigate('/dashboard')}
          className={cx('inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition hover:-translate-y-0.5', dark ? 'hover:bg-white/10' : 'hover:bg-ink/[0.06]')}
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Library</span>
        </button>
        <span className={cx('hidden h-6 w-px sm:block', dark ? 'bg-white/15' : 'bg-line-2')} aria-hidden />
        <BookCover title={book.title} cover={book.cover} image={book.coverImage} size="sm" className="hidden w-7 shrink-0 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-bold">{book.title}</p>
          <p className={cx('truncate text-xs', dark ? 'text-paper/55' : 'text-muted')}>{author?.name}</p>
        </div>

        <div role="radiogroup" aria-label="Reading theme" className={cx('hidden items-center gap-1 rounded-full p-1 md:flex', dark ? 'bg-white/10' : 'bg-ink/[0.05]')}>
          {(Object.keys(themes) as Theme[]).map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={theme === k}
              onClick={() => persistTheme(k)}
              className={cx('flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition', theme === k ? (dark ? 'bg-paper text-ink' : 'bg-white text-ink shadow-card') : dark ? 'text-paper/70 hover:text-paper' : 'text-muted hover:text-ink')}
            >
              <span className="size-3 rounded-full border border-black/15" style={{ background: themes[k].swatch }} aria-hidden />
              {themes[k].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => persistTheme(theme === 'light' ? 'sepia' : theme === 'sepia' ? 'night' : 'light')}
          className={cx('grid size-10 place-items-center rounded-full md:hidden', dark ? 'hover:bg-white/10' : 'hover:bg-ink/[0.06]')}
          aria-label={`Reading theme: ${t.label}. Tap to change.`}
        >
          <span className="size-4 rounded-full border border-black/20" style={{ background: t.swatch }} />
        </button>
        <Button
          variant={dark ? 'light' : 'outline'}
          size="sm"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true)
            try {
              await downloadBookPdf(book)
            } catch {
              toast({ title: 'Download failed', tone: 'error' })
            } finally {
              setDownloading(false)
            }
          }}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
          <span className="hidden sm:inline">Download</span>
        </Button>
        <button
          onClick={toggleFullscreen}
          className={cx('hidden size-10 place-items-center rounded-full transition hover:-translate-y-0.5 sm:grid', dark ? 'hover:bg-white/10' : 'hover:bg-ink/[0.06]')}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          title="Full screen (F)"
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </header>

      {/* Reading stage */}
      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-auto" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {status === 'loading' && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <BookCover title={book.title} cover={book.cover} image={book.coverImage} className="w-32 animate-float" />
              </div>
              <p className={cx('inline-flex items-center gap-2 text-sm font-medium', dark ? 'text-paper/70' : 'text-muted')}>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Opening your book…
              </p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="container-page py-16">
            <EmptyState variant="error" title="We couldn’t open this e-book" description={error} action={<Button variant="dark" onClick={() => window.location.reload()}>Try again</Button>} />
          </div>
        )}

        <div className={cx('flex min-h-full items-center justify-center px-3 py-6 sm:px-8', status !== 'ready' && 'invisible')}>
          <div className="group relative">
            <canvas
              ref={canvasRef}
              key={page}
              className={cx(
                'block rounded-md bg-white shadow-[0_2px_4px_rgb(0_0_0/0.08),0_24px_60px_-20px_rgb(20_23_27/0.45)] transition-[filter] duration-500',
                flip === 'next' && 'animate-[page-next_0.35s_ease-out]',
                flip === 'prev' && 'animate-[page-prev_0.35s_ease-out]',
              )}
              style={{ filter: t.filter }}
              aria-label={`Page ${page} of ${total}`}
              role="img"
            />
            {/* click zones */}
            <button onClick={() => go(page - 1)} disabled={page <= 1} className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize opacity-0 disabled:hidden" aria-label="Previous page" tabIndex={-1} />
            <button onClick={() => go(page + 1)} disabled={page >= total} className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize opacity-0 disabled:hidden" aria-label="Next page" tabIndex={-1} />
            {rendering && <Loader2 className="absolute top-3 right-3 size-4 animate-spin text-muted" aria-hidden />}
          </div>
        </div>

        {/* floating side arrows (desktop) */}
        {status === 'ready' && (
          <>
            <button
              onClick={() => go(page - 1)}
              disabled={page <= 1}
              className={cx('fixed top-1/2 left-4 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full shadow-lift transition hover:scale-105 disabled:opacity-0 lg:grid', dark ? 'bg-white/10 text-paper hover:bg-white/20' : 'bg-white text-ink')}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => go(page + 1)}
              disabled={page >= total}
              className={cx('fixed top-1/2 right-4 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full shadow-lift transition hover:scale-105 disabled:opacity-0 lg:grid', dark ? 'bg-white/10 text-paper hover:bg-white/20' : 'bg-indigo text-white')}
              aria-label="Next page"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <footer className={cx('shrink-0 border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5', dark ? 'border-white/10 bg-[#15181D] text-paper' : 'border-line bg-paper')}>
        <div className="flex items-center gap-3">
          <span className={cx('w-10 text-right text-xs font-semibold tabular-nums', dark ? 'text-paper/60' : 'text-muted')}>{pct}%</span>
          <input
            type="range"
            min={1}
            max={Math.max(1, total)}
            value={page}
            onChange={(e) => go(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-indigo"
            aria-label="Jump to page"
            disabled={!total}
          />
          <span className={cx('hidden w-24 text-xs sm:block', dark ? 'text-paper/60' : 'text-muted')}>{total ? `${Math.max(0, total - page)} pages left` : ''}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className={cx('flex items-center', dark && '[&_button:not([aria-pressed=true])]:text-paper [&_button:hover]:bg-white/10')}>
            <span className="hidden sm:contents">
              <ToolButton label="First page (Home)" onClick={() => go(1)} disabled={page <= 1}>
                <ChevronFirst className="size-5" />
              </ToolButton>
            </span>
            <ToolButton label="Previous page (←)" onClick={() => go(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="size-5" />
            </ToolButton>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const n = parseInt(pageInput, 10)
                if (Number.isFinite(n)) go(n)
                else setPageInput(String(page))
              }}
              className="flex items-center gap-1.5 px-1 text-sm"
            >
              <label htmlFor="page-input" className="sr-only">
                Page number
              </label>
              <input
                id="page-input"
                inputMode="numeric"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
                onBlur={() => setPageInput(String(page))}
                className={cx('h-9 w-12 rounded-lg border text-center font-semibold tabular-nums focus:border-indigo focus:ring-2 focus:ring-indigo/20 focus:outline-none', dark ? 'border-white/15 bg-white/5' : 'border-line-2 bg-white')}
              />
              <span className={cx('whitespace-nowrap', dark ? 'text-paper/60' : 'text-muted')}>/ {total || '—'}</span>
            </form>
            <ToolButton label="Next page (→)" onClick={() => go(page + 1)} disabled={!total || page >= total}>
              <ChevronRight className="size-5" />
            </ToolButton>
            <span className="hidden sm:contents">
              <ToolButton label="Last page (End)" onClick={() => go(total)} disabled={!total || page >= total}>
                <ChevronLast className="size-5" />
              </ToolButton>
            </span>
          </div>

          <div className={cx('flex items-center', dark && '[&_button]:text-paper [&_button:hover]:bg-white/10')}>
            <ToolButton label="Zoom out (−)" onClick={() => zoomBy(-0.1)}>
              <Minus className="size-4" />
            </ToolButton>
            <span className="hidden w-12 text-center text-xs font-semibold tabular-nums sm:block">{Math.round(scaleShown * 100)}%</span>
            <ToolButton label="Zoom in (+)" onClick={() => zoomBy(0.1)}>
              <Plus className="size-4" />
            </ToolButton>
            <ToolButton label="Fit width" onClick={() => setZoom('fit-width')} active={zoom === 'fit-width'}>
              <MoveHorizontal className="size-4" />
            </ToolButton>
            <ToolButton label="Fit page (0)" onClick={() => setZoom('fit-page')} active={zoom === 'fit-page'}>
              <Expand className="size-4" />
            </ToolButton>
          </div>
        </div>
        <p className={cx('hidden pb-1 text-center text-[11px] lg:block', dark ? 'text-paper/40' : 'text-muted')}>
          ← → turn pages · + − zoom · 0 fit page · F full screen · <Link to="/dashboard" className="underline-offset-2 hover:underline">Back to library</Link>
        </p>
      </footer>
    </div>
  )
}

export default function Reader() {
  const { bookId = '' } = useParams()
  return (
    <RequireRole role="any">
      <ReaderView key={bookId} bookId={bookId} />
    </RequireRole>
  )
}
