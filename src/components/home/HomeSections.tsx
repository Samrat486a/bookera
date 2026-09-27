import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, BookOpenCheck, Compass, LayoutGrid, MessageCircle, PenTool, Search, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Spotlight, trackSpotlight } from '../ui/Spotlight'
import { InteractiveGrid } from '../ui/InteractiveGrid'
import { useStore } from '../../context/StoreContext'
import { categories } from '../../data/categories'
import { useCountUp, useInView } from '../../lib/hooks'
import { cx } from '../../lib/format'
import { ButtonLink } from '../ui/Button'
import { SectionHeader } from '../ui/SectionHeader'
import { EbookCard } from '../ebooks/EbookCard'
import { BookCover } from '../ebooks/BookCover'
import { CategoryCard } from '../cards/CategoryCard'

/* ─────────────────────────── Stats ─────────────────────────── */

type StatVisual = 'shelf' | 'faces' | 'pulse' | 'tiles'
const stats: Array<{ value: number; suffix: string; label: string; note: string; accent: string; icon: LucideIcon; visual: StatVisual }> = [
  { value: 10, suffix: 'K+', label: 'E-books', note: 'Curated titles across every shelf', accent: '#3654FF', icon: BookOpen, visual: 'shelf' },
  { value: 500, suffix: '+', label: 'Authors', note: 'Experts, educators & storytellers', accent: '#FFAE1F', icon: PenTool, visual: 'faces' },
  { value: 50, suffix: 'K+', label: 'Readers', note: 'Learning something new every day', accent: '#3654FF', icon: Users, visual: 'pulse' },
  { value: 25, suffix: '+', label: 'Categories', note: 'From code and AI to fiction', accent: '#FFAE1F', icon: LayoutGrid, visual: 'tiles' },
]

function StatVisualArt({ kind, accent, active }: { kind: StatVisual; accent: string; active: boolean }) {
  if (kind === 'shelf')
    return (
      <div className="flex h-9 items-end gap-1" aria-hidden>
        {[
          [22, accent],
          [30, '#14171B'],
          [18, '#FFAE1F'],
          [34, accent],
          [26, '#FF5D5D'],
        ].map(([h, c], i) => (
          <span
            key={i}
            className="w-2 origin-bottom rounded-[3px] transition-transform duration-500 ease-out group-hover:scale-y-115"
            style={{ height: Number(h), background: String(c), transitionDelay: `${i * 45}ms` }}
          />
        ))}
      </div>
    )
  if (kind === 'faces')
    return (
      <div className="flex h-9 items-center -space-x-2 transition-all duration-500 group-hover:-space-x-1" aria-hidden>
        {['#3654FF', '#FF5D5D', '#1F8A5B', accent].map((c, i) => (
          <span key={i} className="size-7 rounded-full border-2 border-white" style={{ background: c }} />
        ))}
        <span className="grid size-7 place-items-center rounded-full border-2 border-white bg-paper-2 text-[10px] font-bold text-ink">+</span>
      </div>
    )
  if (kind === 'pulse')
    return (
      <svg viewBox="0 0 96 36" className="h-9 w-24 overflow-visible" aria-hidden>
        <path
          d="M2 30 L16 24 L28 27 L42 16 L54 20 L68 9 L80 12 L94 3"
          pathLength={1}
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-[stroke-dashoffset] duration-[1600ms] ease-out [stroke-dasharray:1_1] group-hover:[filter:drop-shadow(0_2px_4px_rgb(54_84_255/0.45))]"
          style={{ strokeDashoffset: active ? 0 : 1 }}
        />
        <circle cx="94" cy="3" r="3.5" fill={accent} className="animate-pulse" />
      </svg>
    )
  return (
    <div className="grid h-9 grid-cols-6 content-center gap-1" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="size-2.5 rounded-[3px] bg-ink/10 transition-colors duration-300 group-hover:bg-[var(--accent)]"
          style={{ transitionDelay: `${i * 35}ms`, opacity: 1 - (i % 5) * 0.12 }}
        />
      ))}
    </div>
  )
}

function StatTile({ stat, start, index }: { stat: (typeof stats)[number]; start: boolean; index: number }) {
  const n = useCountUp(stat.value, start, 1200 + index * 150)
  const Icon = stat.icon
  return (
    <div
      onMouseMove={trackSpotlight}
      className="group relative isolate flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-card transition duration-500 ease-out hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)] hover:shadow-[0_28px_50px_-26px_color-mix(in_srgb,var(--accent)_60%,transparent)] sm:p-7"
      style={{ ['--accent' as string]: stat.accent, ['--on-accent' as string]: stat.accent === '#FFAE1F' ? '#14171B' : '#FFFFFF' }}
    >
      <Spotlight color={stat.accent} size={320} strength={11} />
      <span className="bg-dots pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 [mask-image:linear-gradient(to_bottom,transparent,black)] group-hover:opacity-30" aria-hidden />

      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-paper-2 text-ink transition duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-[var(--on-accent)]">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="hidden sm:block">
          <StatVisualArt kind={stat.visual} accent={stat.accent} active={start} />
        </div>
      </div>

      <p className="mt-8 font-display text-[clamp(2.4rem,5.5vw,4.25rem)] leading-none font-bold tracking-[-0.045em] text-ink tabular-nums transition-transform duration-500 ease-out group-hover:translate-x-1">
        {n}
        <span style={{ color: stat.accent }}>{stat.suffix}</span>
      </p>
      <p className="mt-3 text-xs font-semibold tracking-[0.16em] text-ink-2 uppercase">{stat.label}</p>
      <p className="mt-1.5 text-sm leading-snug text-muted">{stat.note}</p>

      {/* accent rule that fills on hover */}
      <span className="mt-auto block pt-6" aria-hidden>
        <span className="block h-px w-full bg-line">
          <span className="block h-px w-8 bg-[var(--accent)] transition-all duration-700 ease-out group-hover:w-full" />
        </span>
      </span>
    </div>
  )
}

export function Stats() {
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  return (
    <section aria-labelledby="stats-title" className="relative overflow-hidden border-y border-line bg-white">
      <InteractiveGrid className="[mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_70%)]" />
      <div ref={ref} className="container-page relative py-16 sm:py-24">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">
              <span className="h-px w-6 bg-ink/30" aria-hidden />
              Bookera in numbers
            </p>
            <h2 id="stats-title" className="mt-3 max-w-xl text-[2rem] leading-[1.05] font-bold sm:text-5xl">
              A library that grows <span className="text-indigo">every week.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-muted">Readers, writers, and ideas from around the world — gathered in one beautifully organised place.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:mt-14 sm:gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={inView ? 'animate-fade-up' : 'opacity-0'} style={{ animationDelay: `${i * 90}ms` }}>
              <StatTile stat={s} start={inView} index={i} />
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">Figures are illustrative demo data.</p>
      </div>
    </section>
  )
}

/* ─────────────────────── Featured e-books ─────────────────────── */

const tabs = ['Featured', 'Newest', 'Top rated'] as const

export function FeaturedBooks() {
  const { publicBooks } = useStore()
  const [tab, setTab] = useState<(typeof tabs)[number]>('Featured')

  const list = useMemo(() => {
    const bs = [...publicBooks]
    if (tab === 'Featured') return bs.filter((b) => b.featured).slice(0, 6)
    if (tab === 'Newest') return bs.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6)
    return bs.sort((a, b) => b.rating - a.rating || b.readers - a.readers).slice(0, 6)
  }, [publicBooks, tab])

  return (
    <section className="container-page py-20 sm:py-28" aria-labelledby="featured-title">
      <SectionHeader
        eyebrow="Curated shelf"
        title={<span id="featured-title">What’s worth reading?</span>}
        description="Discover popular e-books selected for curious minds."
        action={
          <ButtonLink to="/ebooks" variant="outline">
            View All E-books <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        }
      />
      <div role="tablist" aria-label="Book shelf" className="no-scrollbar mt-10 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx(
              'h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition',
              tab === t ? 'bg-ink text-paper' : 'border border-line bg-white text-ink-2 hover:border-line-2 hover:text-ink',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={tab} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b, i) => (
          <EbookCard key={b.id} book={b} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────── How it works ─────────────────────────── */

const steps = [
  { n: '01', title: 'Discover', icon: Search, text: 'Browse thousands of e-books across different categories and interests.' },
  { n: '02', title: 'Choose', icon: Compass, text: 'Explore book details, authors, ratings, and descriptions before adding a book.' },
  { n: '03', title: 'Read & Learn', icon: BookOpenCheck, text: 'Build your personal digital library and enjoy your books anytime.' },
]

export function HowItWorks() {
  const tones = ['#14171B', '#3654FF', '#FFAE1F']
  return (
    <section className="border-y border-line bg-white py-20 sm:py-28" aria-labelledby="how-title">
      <div className="container-page">
        <SectionHeader eyebrow="How it works" title={<span id="how-title">From discovery to your library in three steps.</span>} />
        <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
          <span className="absolute top-[52px] right-[16%] left-[16%] hidden border-t-2 border-dashed border-line-2 md:block" aria-hidden />
          {steps.map(({ n, title, icon: Icon, text }, i) => {
            const tone = tones[i]!
            return (
              <li
                key={n}
                onMouseMove={trackSpotlight}
                className="group relative isolate flex flex-col overflow-hidden rounded-3xl border border-line bg-paper p-7 transition duration-500 ease-out hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--tone)_30%,transparent)] hover:bg-white hover:shadow-[0_28px_50px_-26px_color-mix(in_srgb,var(--tone)_55%,transparent)] sm:p-8"
                style={{ ['--tone' as string]: tone }}
              >
                <Spotlight color={tone} size={340} strength={10} />
                <span className="bg-dots pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 [mask-image:linear-gradient(to_bottom,transparent,black)] group-hover:opacity-30" aria-hidden />
                <Icon
                  className="pointer-events-none absolute -right-6 -bottom-6 -z-10 size-36 translate-x-3 translate-y-3 rotate-12 opacity-0 transition duration-700 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0 group-hover:opacity-[0.06]"
                  style={{ color: tone }}
                  strokeWidth={1.25}
                  aria-hidden
                />
                <div className="flex items-center justify-between">
                  <span
                    className="relative font-display text-[5.5rem] leading-[0.8] font-bold tracking-[-0.06em] text-transparent transition duration-500 ease-out group-hover:-translate-y-1"
                    style={{ WebkitTextStroke: `2px ${tone}` }}
                  >
                    {n}
                    {/* fill rises into the outlined number */}
                    <span
                      className="absolute inset-0 transition-[clip-path] duration-700 ease-out [clip-path:inset(100%_0_0_0)] group-hover:[clip-path:inset(0_0_0_0)]"
                      style={{ color: `color-mix(in srgb, ${tone} 14%, transparent)` }}
                      aria-hidden
                    >
                      {n}
                    </span>
                  </span>
                  <span
                    className="grid size-12 place-items-center rounded-2xl transition duration-500 ease-out group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-[0_12px_24px_-10px_var(--tone)]"
                    style={{ background: tone, color: tone === '#FFAE1F' ? '#14171B' : '#fff' }}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                </div>
                <h3 className="mt-8 text-2xl font-bold transition-transform duration-500 ease-out group-hover:translate-x-1">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted transition-colors duration-300 group-hover:text-ink-2">{text}</p>
                <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[var(--tone)] transition-transform duration-500 ease-out group-hover:scale-x-100" aria-hidden />
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ─────────────────────────── Categories ─────────────────────────── */

export function CategoriesSection() {
  const { publicBooks } = useStore()
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    publicBooks.forEach((b) => m.set(b.category, (m.get(b.category) ?? 0) + 1))
    return m
  }, [publicBooks])

  return (
    <section className="container-page py-20 sm:py-28" aria-labelledby="cat-title">
      <SectionHeader
        eyebrow="Browse"
        title={<span id="cat-title">Explore by category</span>}
        description="Find your next great read based on your interests."
        action={
          <ButtonLink to="/categories" variant="outline">
            All Categories <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        }
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categories.slice(0, 8).map((c) => (
          <CategoryCard key={c.name} category={c} count={counts.get(c.name) ?? 0} />
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────── Publish CTA ─────────────────────────── */

export function PublishCTA() {
  const { getBook } = useStore()
  const draft = getBook('the-quiet-internet') ?? getBook('deep-focus')
  return (
    <section className="container-page py-20 sm:py-24" aria-labelledby="publish-title">
      <div className="relative overflow-hidden rounded-[36px] bg-indigo px-6 py-14 text-white sm:px-12 sm:py-16 lg:px-16">
        <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full border-[40px] border-white/10" aria-hidden />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase">
              <PenTool className="size-3.5" aria-hidden /> For writers
            </p>
            <h2 id="publish-title" className="mt-5 text-4xl leading-[1.02] font-bold sm:text-6xl">
              Have a book to publish?
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/80">
              Share your knowledge with readers around the world. Tell us about your book — our team will guide you from manuscript to launch.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/publish#contact" variant="light" size="lg">
                <MessageCircle className="size-4" aria-hidden /> Talk to Our Team
              </ButtonLink>
              <ButtonLink to="/publish" size="lg" className="border border-white/35 bg-transparent shadow-none hover:bg-white/10">
                How Publishing Works <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>

          {/* Publishing preview */}
          <div className="relative mx-auto w-full max-w-sm" aria-hidden>
            <div className="rotate-2 rounded-3xl bg-white p-5 text-ink shadow-lift">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Publisher Studio</p>
                <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] font-semibold text-leaf">● Live</span>
              </div>
              <div className="mt-4 flex gap-4">
                {draft && <BookCover title={draft.title} category={draft.category} cover={draft.cover} size="sm" className="w-24 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-tight font-bold">{draft?.title}</p>
                  <p className="mt-1 text-xs text-muted">Published · {draft?.category}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-paper p-2.5">
                      <p className="font-display text-lg font-bold">5.3K</p>
                      <p className="text-[11px] text-muted">Readers</p>
                    </div>
                    <div className="rounded-xl bg-paper p-2.5">
                      <p className="font-display text-lg font-bold">4.6★</p>
                      <p className="text-[11px] text-muted">Rating</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-end gap-1.5 border-t border-line pt-4">
                {[30, 45, 38, 60, 52, 74, 68, 90].map((h, i) => (
                  <span key={i} className={cx('flex-1 rounded-t-[4px]', i === 7 ? 'bg-indigo' : 'bg-indigo/20')} style={{ height: `${h * 0.5}px` }} />
                ))}
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 -rotate-3 rounded-2xl bg-saffron px-4 py-2.5 text-sm font-semibold text-ink shadow-lift">+ 1,240 new readers this week</div>
          </div>
        </div>
      </div>
    </section>
  )
}
