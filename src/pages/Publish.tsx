import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  Palette,
  PenTool,
  Phone,
  Rocket,
  Send,
  Sparkles,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { categories } from '../data/categories'
import { site } from '../config/site'
import { cx } from '../lib/format'
import { InteractiveGrid } from '../components/ui/InteractiveGrid'
import { Spotlight, trackSpotlight } from '../components/ui/Spotlight'
import { Button, ButtonLink, buttonClass } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'
import { BookCover } from '../components/ebooks/BookCover'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Public-domain quotes about writing and reading.
const quotes = [
  { text: 'Either write something worth reading or do something worth writing.', by: 'Benjamin Franklin' },
  { text: 'Fill your paper with the breathings of your heart.', by: 'William Wordsworth' },
  { text: 'Words are, of course, the most powerful drug used by mankind.', by: 'Rudyard Kipling' },
  { text: 'How vain it is to sit down to write when you have not stood up to live.', by: 'Henry David Thoreau' },
  { text: 'The pen is mightier than the sword.', by: 'Edward Bulwer-Lytton' },
]

const stages = ['Draft', 'Editing', 'Designed', 'Published'] as const

const steps = [
  { n: '01', title: 'Share your idea', text: 'Tell us about your book — the topic, the readers it’s for, and where you are in the journey.', icon: PenTool, tone: '#14171B' },
  { n: '02', title: 'Talk with our team', text: 'We’ll get in touch to understand your goals and suggest the best path to publishing.', icon: MessageCircle, tone: '#3654FF' },
  { n: '03', title: 'Edit & design', text: 'Polish the manuscript and give it a beautiful Bookera cover and reading layout.', icon: Palette, tone: '#FFAE1F' },
  { n: '04', title: 'Launch to readers', text: 'Your e-book goes live in the catalogue, ready for curious readers to discover.', icon: Rocket, tone: '#FF5D5D' },
]

/* ─────────────────────────── Hero visual ─────────────────────────── */

function ManuscriptVisual() {
  const { getBook } = useStore()
  const book = getBook('the-quiet-internet') ?? getBook('deep-focus')
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => setStage((s) => (s + 1) % stages.length), 1800)
    return () => window.clearInterval(t)
  }, [])

  const lines = [100, 92, 97, 64, 0, 95, 88, 100, 72]

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]" role="img" aria-label="Animated manuscript turning into a published e-book">
      {/* orbit rings */}
      <div className="absolute inset-[8%] animate-spin-slow rounded-full border border-dashed border-ink/15" aria-hidden>
        <span className="absolute -top-1.5 left-1/2 size-3 rounded-full bg-saffron" />
        <span className="absolute top-1/2 -right-1.5 size-2.5 rounded-full bg-indigo" />
      </div>
      <div className="absolute inset-[20%] rounded-full bg-saffron/15 blur-2xl" aria-hidden />

      {/* published book behind */}
      {book && (
        <div className="absolute top-[10%] right-[6%] w-[34%] animate-float [--r:8deg] [animation-delay:-2s]">
          <BookCover title={book.title} category={book.category} cover={book.cover} size="sm" />
          <span className="absolute -top-3 -left-3 rotate-[-8deg] rounded-full bg-leaf px-2.5 py-1 text-[11px] font-bold text-white shadow-lift">Published ✓</span>
        </div>
      )}

      {/* manuscript page */}
      <div className="absolute top-[18%] left-[6%] w-[58%] -rotate-3 rounded-2xl border border-line bg-white p-5 shadow-lift sm:p-6">
        <div className="flex items-center justify-between text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
          <span>Manuscript</span>
          <span>Ch. 01</span>
        </div>
        <p className="mt-3 font-display text-lg leading-tight font-bold sm:text-xl">
          Chapter One
          <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-0.5 animate-blink bg-indigo" aria-hidden />
        </p>
        <div className="mt-4 space-y-2">
          {lines.map((w, i) =>
            w === 0 ? (
              <div key={i} className="h-2" />
            ) : (
              <div
                key={i}
                className={cx('h-[6px] origin-left animate-type-line rounded-full', i === 6 ? 'bg-saffron/60' : 'bg-ink/12')}
                style={{ width: `${w}%`, animationDelay: `${i * 0.45}s` }}
              />
            ),
          )}
        </div>
      </div>

      {/* pen */}
      <div className="absolute top-[12%] left-[52%] grid size-14 animate-float place-items-center rounded-2xl bg-ink text-saffron shadow-lift [--r:-10deg] [animation-delay:-1s]">
        <PenTool className="size-6" aria-hidden />
      </div>

      {/* status pipeline */}
      <div className="absolute right-[4%] bottom-[10%] w-[62%] rounded-2xl border border-line bg-white p-4 shadow-lift">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Your book</p>
          <span key={stage} className="animate-pop-in rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
            {stages[stage]}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {stages.map((s, i) => (
            <div key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
              <div className={cx('h-full rounded-full transition-all duration-700 ease-out', i <= stage ? 'w-full' : 'w-0', i === stages.length - 1 ? 'bg-leaf' : 'bg-indigo')} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted">
          {stages.map((s, i) => (
            <span key={s} className={cx('transition-colors', i <= stage && 'font-semibold text-ink')}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <Sparkles className="absolute bottom-[34%] left-[8%] size-6 animate-float text-indigo [animation-delay:-3s]" aria-hidden />
    </div>
  )
}

/* ─────────────────────────── Quotes (horizontal scroll) ─────────────────────────── */

const quoteTones = ['#3654FF', '#FFAE1F', '#FF5D5D', '#1F8A5B', '#14171B']

function QuoteCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(0)
  const [edges, setEdges] = useState({ start: true, end: false })

  const measure = () => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const card = el.firstElementChild as HTMLElement | null
    const step = card ? card.offsetWidth + 20 : el.clientWidth
    setProgress(max > 0 ? el.scrollLeft / max : 0)
    setActive(el.scrollLeft > max - 4 ? quotes.length - 1 : Math.min(quotes.length - 1, Math.round(el.scrollLeft / step)))
    setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft > max - 4 })
  }

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const go = (dir: 1 | -1) => {
    const el = trackRef.current
    const card = el?.firstElementChild as HTMLElement | null
    if (!el || !card) return
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: 'smooth' })
  }

  // Mouse drag-to-scroll (touch and trackpads scroll natively)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !trackRef.current) return
    drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false }
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = trackRef.current
    if (!d || !el) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 3) d.moved = true
    el.scrollLeft = d.left - dx
  }
  const endDrag = () => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    // let snap settle on the nearest card
    requestAnimationFrame(() => {
      const el = trackRef.current
      const card = el?.firstElementChild as HTMLElement | null
      if (!el || !card) return
      const step = card.offsetWidth + 20
      el.scrollTo({ left: Math.round(el.scrollLeft / step) * step, behavior: 'smooth' })
    })
  }

  return (
    <section className="relative overflow-hidden border-y border-line bg-white py-20 sm:py-28" aria-labelledby="quotes-title">
      <InteractiveGrid className="[mask-image:radial-gradient(ellipse_at_top_left,black_10%,transparent_60%)]" />
      <div className="container-page relative">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">
              <span className="h-px w-6 bg-ink/30" aria-hidden />
              Words to write by
            </p>
            <h2 id="quotes-title" className="mt-3 max-w-xl text-[2rem] leading-[1.05] font-bold sm:text-5xl">
              A little inspiration for your <span className="text-indigo">next chapter.</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-bold text-muted tabular-nums">
              <span className="text-ink">{String(active + 1).padStart(2, '0')}</span> / {String(quotes.length).padStart(2, '0')}
            </span>
            <button
              onClick={() => go(-1)}
              disabled={edges.start}
              className="grid size-12 place-items-center rounded-full border border-line-2 bg-white text-ink transition duration-300 hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-[0_10px_24px_-12px_rgb(20_23_27/0.3)] disabled:pointer-events-none disabled:opacity-35"
              aria-label="Previous quote"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <button
              onClick={() => go(1)}
              disabled={edges.end}
              className="grid size-12 place-items-center rounded-full bg-ink text-paper transition duration-300 hover:-translate-y-0.5 hover:bg-ink-2 hover:shadow-[0_12px_24px_-12px_rgb(20_23_27/0.55)] disabled:pointer-events-none disabled:opacity-35"
              aria-label="Next quote"
            >
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          onScroll={measure}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          tabIndex={0}
          role="region"
          aria-label="Quotes — scroll horizontally"
          className={cx(
            'no-scrollbar -mx-4 mt-10 flex scroll-px-4 gap-5 overflow-x-auto px-4 pt-2 pb-6 select-none sm:mr-[calc(50%-50vw)] sm:ml-0 sm:scroll-pl-0 sm:pr-[calc(50vw-50%)] sm:pl-0',
            dragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory',
          )}
        >
          {quotes.map((q, i) => {
            const tone = quoteTones[i % quoteTones.length]!
            return (
              <figure
                key={q.by}
                onMouseMove={trackSpotlight}
                className="group relative isolate flex w-[86%] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-line bg-paper p-7 transition duration-500 ease-out hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--tone)_30%,transparent)] hover:bg-white hover:shadow-[0_28px_50px_-26px_color-mix(in_srgb,var(--tone)_55%,transparent)] sm:w-[62%] sm:p-10 lg:w-[46%]"
                style={{ ['--tone' as string]: tone }}
              >
                <Spotlight color={tone} size={380} strength={10} />
                <span className="font-display text-7xl leading-[0.6] font-bold transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-110" style={{ color: tone }} aria-hidden>
                  “
                </span>
                <blockquote className="mt-6 font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.15] font-bold tracking-[-0.02em] text-ink">{q.text}</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 pt-8 text-sm font-medium text-ink-2">
                  <span className="h-px w-8 transition-all duration-500 group-hover:w-14" style={{ background: tone }} aria-hidden />
                  {q.by}
                </figcaption>
              </figure>
            )
          })}
        </div>

        <div className="mt-2 flex items-center gap-4">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-2" aria-hidden>
            <div className="h-full rounded-full bg-indigo transition-[width] duration-300 ease-out" style={{ width: `${Math.max(1 / quotes.length, progress) * 100}%` }} />
          </div>
          <p className="shrink-0 text-xs text-muted">Scroll, swipe or drag →</p>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Contact form ─────────────────────────── */

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', title: '', genre: 'Programming', stage: 'Writing in progress', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors(({ [k]: _drop, ...rest }) => rest)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (form.name.trim().length < 2) errs.name = 'Please tell us your name.'
    if (!EMAIL_RE.test(form.email)) errs.email = 'Please enter a valid email address.'
    if (form.title.trim().length < 2) errs.title = 'What’s your book called? A working title is fine.'
    if (form.message.trim().length < 20) errs.message = 'Tell us a little more (20+ characters).'
    setErrors(errs)
    const first = Object.keys(errs)[0]
    if (first) {
      document.getElementById(`pc-${first}`)?.focus()
      return
    }
    setStatus('sending')
    window.setTimeout(() => setStatus('sent'), 900)
  }

  if (status === 'sent') {
    return (
      <div className="flex h-full animate-pop-in flex-col items-center justify-center rounded-3xl border border-line bg-white p-8 text-center shadow-card sm:p-12">
        <span className="relative grid size-20 place-items-center rounded-full bg-leaf text-white">
          <span className="absolute inset-0 animate-ping rounded-full bg-leaf/30" aria-hidden />
          <Check className="relative size-9" strokeWidth={3} aria-hidden />
        </span>
        <h3 className="mt-8 text-3xl font-bold">Thanks, {form.name.split(' ')[0]}!</h3>
        <p className="mt-3 max-w-sm text-muted">
          We’ve got the details for <b className="text-ink">“{form.title}”</b>. Our team will reach out to <b className="text-ink">{form.email}</b> within {site.responseTime}.
        </p>
        <Button
          variant="outline"
          className="mt-8"
          onClick={() => {
            setForm({ name: '', email: '', phone: '', title: '', genre: 'Programming', stage: 'Writing in progress', message: '' })
            setStatus('idle')
          }}
        >
          Send another message
        </Button>
        <p className="mt-6 text-xs text-muted">Demo mode — messages aren’t sent anywhere yet.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
      <h3 className="font-display text-2xl font-bold">Tell us about your book</h3>
      <p className="mt-1 text-sm text-muted">It takes two minutes. No commitment.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Input id="pc-name" label="Your name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />
        <Input id="pc-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <Input id="pc-phone" label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        <Input id="pc-title" label="Book title" placeholder="A working title is fine" value={form.title} onChange={set('title')} error={errors.title} required />
        <Select label="Genre" value={form.genre} onChange={set('genre')} options={categories.map((c) => c.name)} />
        <Select label="Where are you?" value={form.stage} onChange={set('stage')} options={['Just an idea', 'Writing in progress', 'Finished manuscript', 'Already published elsewhere']} />
        <Textarea
          id="pc-message"
          label="Tell us about it"
          wrapperClassName="sm:col-span-2"
          placeholder="What’s the book about, and who is it for?"
          value={form.message}
          onChange={set('message')}
          error={errors.message}
          required
        />
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">We’ll only use your details to reply to you.</p>
        <Button type="submit" size="lg" disabled={status === 'sending'}>
          {status === 'sending' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {status === 'sending' ? 'Sending…' : 'Send to Our Team'}
        </Button>
      </div>
    </form>
  )
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function Publish() {
  const contacts = [
    { icon: Mail, label: 'Email the team', value: site.contactEmail, href: `mailto:${site.contactEmail}?subject=${encodeURIComponent('Publishing my book on Bookera')}`, tone: '#3654FF' },
    { icon: MessageCircle, label: 'WhatsApp', value: site.phoneDisplay, href: `https://wa.me/${site.phoneLink.replace(/\D/g, '')}`, tone: '#1F8A5B' },
    { icon: Phone, label: 'Call us', value: site.phoneDisplay, href: `tel:${site.phoneLink}`, tone: '#FFAE1F' },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <InteractiveGrid className="[mask-image:radial-gradient(ellipse_at_60%_40%,black_25%,transparent_75%)]" />
        <div className="container-page relative grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pt-20 lg:pb-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 py-1 pr-3 pl-1 text-[13px] font-medium text-ink-2 shadow-card">
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-paper">
                <PenTool className="size-3 text-saffron" aria-hidden /> Writers
              </span>
              Publish with Bookera
            </p>
            <h1 className="mt-7 text-[clamp(2.75rem,7.5vw,5.5rem)] leading-[0.95] font-bold tracking-[-0.045em]">
              Your story deserves to be{' '}
              <span className="relative inline-block text-indigo">
                read.
                <svg viewBox="0 0 200 20" className="absolute -bottom-2 left-0 h-3 w-full text-saffron sm:h-4" preserveAspectRatio="none" aria-hidden>
                  <path d="M3 14C50 5 120 3 197 9" pathLength={1} className="animate-draw [stroke-dasharray:1_1]" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-muted">
              Have a book to publish? Talk directly with the Bookera team. We’ll help you shape your manuscript, design a beautiful e-book, and put it in front of curious readers.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="#contact" size="lg">
                <MessageCircle className="size-4" aria-hidden /> Talk to Our Team
              </ButtonLink>
              <a href={`mailto:${site.contactEmail}`} className={buttonClass('outline', 'lg')}>
                <Mail className="size-4" aria-hidden /> Email Us
              </a>
            </div>
            <ul className="mt-9 grid gap-3 text-[15px] text-ink-2 sm:grid-cols-3">
              {['Personal guidance', 'Beautiful design', 'Curious readers'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-leaf text-white">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-fade-up [animation-delay:120ms]">
            <ManuscriptVisual />
          </div>
        </div>
      </section>

      <QuoteCarousel />

      {/* How it works */}
      <section id="how" className="container-page scroll-mt-24 py-20 sm:py-28" aria-labelledby="how-title">
        <SectionHeader eyebrow="How it works" title={<span id="how-title">From manuscript to library, together.</span>} description="A simple, personal process — you focus on the writing, we help with everything else." />
        <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <span className="absolute top-[58px] right-[12%] left-[12%] hidden border-t-2 border-dashed border-line-2 lg:block" aria-hidden />
          {steps.map(({ n, title, text, icon: Icon, tone }, i) => (
            <li
              key={n}
              onMouseMove={trackSpotlight}
              className="group relative isolate animate-fade-up overflow-hidden rounded-3xl border border-line bg-white p-7 shadow-card transition duration-500 ease-out hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--tone)_30%,transparent)] hover:shadow-[0_26px_50px_-24px_color-mix(in_srgb,var(--tone)_55%,transparent)]"
              style={{ ['--tone' as string]: tone, animationDelay: `${i * 80}ms` }}
            >
              <Spotlight color={tone} strength={10} />
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl text-white transition duration-500 ease-out group-hover:scale-110 group-hover:-rotate-6" style={{ background: tone, color: tone === '#FFAE1F' ? '#14171B' : '#fff' }}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-display text-4xl font-bold text-transparent transition duration-500 [-webkit-text-stroke:1.5px_var(--color-line-2)] group-hover:[-webkit-text-stroke-color:var(--tone)]">{n}</span>
              </div>
              <h3 className="mt-8 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
              <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[var(--tone)] transition-transform duration-500 ease-out group-hover:scale-x-100" aria-hidden />
            </li>
          ))}
        </ol>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 border-t border-line bg-paper-2/60 py-20 sm:py-28" aria-labelledby="contact-title">
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <p className="eyebrow">
              <span className="h-px w-6 bg-ink/30" aria-hidden />
              Contact the owner
            </p>
            <h2 id="contact-title" className="mt-3 text-[2rem] leading-[1.05] font-bold sm:text-5xl">
              Let’s talk about your book.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">Send us a note or reach out directly. Every message is read by our team — not a bot.</p>

            <ul className="mt-8 space-y-3">
              {contacts.map(({ icon: Icon, label, value, href, tone }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    onMouseMove={trackSpotlight}
                    className="group relative isolate flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-card transition duration-500 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tone)_35%,transparent)] hover:shadow-lift"
                    style={{ ['--tone' as string]: tone }}
                  >
                    <Spotlight color={tone} size={260} strength={12} />
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl transition duration-500 group-hover:scale-105 group-hover:bg-[var(--tone)] group-hover:text-white" style={{ background: `color-mix(in srgb, ${tone} 12%, white)`, color: tone }}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-muted">{label}</span>
                      <span className="block truncate font-semibold text-ink">{value}</span>
                    </span>
                    <ArrowRight className="size-4 text-muted transition duration-300 group-hover:translate-x-1 group-hover:text-[var(--tone)]" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-line-2 p-4 text-sm text-muted">
              <Clock className="size-4 shrink-0" aria-hidden />
              We usually reply within {site.responseTime}.
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-line-2 p-4 text-sm text-muted">
              <BookOpenCheck className="size-4 shrink-0" aria-hidden />
              You don’t need a finished manuscript to start the conversation.
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  )
}
