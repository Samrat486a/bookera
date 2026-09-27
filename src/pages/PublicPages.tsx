import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Compass, GraduationCap, PenTool, Search, Sprout } from 'lucide-react'
import { Spotlight, trackSpotlight } from '../components/ui/Spotlight'
import { useStore } from '../context/StoreContext'
import { categories } from '../data/categories'
import { cx } from '../lib/format'
import { Hero } from '../components/home/Hero'
import { CategoriesSection, FeaturedBooks, HowItWorks, PublishCTA, Stats } from '../components/home/HomeSections'
import { CategoryCard } from '../components/cards/CategoryCard'
import { BookCover } from '../components/ebooks/BookCover'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/States'
import { SectionHeader } from '../components/ui/SectionHeader'
import { InteractiveGrid } from '../components/ui/InteractiveGrid'

/* ─────────────────────────── Home ─────────────────────────── */

export function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <FeaturedBooks />
      <HowItWorks />
      <CategoriesSection />
      <PublishCTA />
    </>
  )
}

/* ─────────────────────────── Page hero ─────────────────────────── */

function PageHero({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <InteractiveGrid className="[mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="container-page relative pt-14 pb-12 sm:pt-20 sm:pb-16">
        <SectionHeader as="h1" eyebrow={eyebrow} title={title} description={description} />
        {children}
      </div>
    </section>
  )
}

/* ─────────────────────────── Categories ─────────────────────────── */

export function Categories() {
  const { publicBooks } = useStore()
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    publicBooks.forEach((b) => m.set(b.category, (m.get(b.category) ?? 0) + 1))
    return m
  }, [publicBooks])

  return (
    <>
      <PageHero eyebrow="Categories" title="Explore by category" description="Find your next great read based on your interests — from code and AI to stories that stay with you." />
      <section className="container-page py-14 sm:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c, i) => (
            <CategoryCard key={c.name} category={c} count={counts.get(c.name) ?? 0} className="animate-fade-up" style={{ animationDelay: `${i * 35}ms` }} />
          ))}
        </div>
      </section>
    </>
  )
}

/* ─────────────────────────── About ─────────────────────────── */

const pillars = [
  { title: 'Discover', icon: Compass, text: 'Find books that match your interests.', tone: '#14171B', chip: 'bg-ink text-paper' },
  { title: 'Read', icon: BookOpen, text: 'Access beautifully presented digital books.', tone: '#3654FF', chip: 'bg-indigo text-white' },
  { title: 'Learn', icon: GraduationCap, text: 'Expand your knowledge through expert-written content.', tone: '#FFAE1F', chip: 'bg-saffron text-ink' },
  { title: 'Create', icon: PenTool, text: 'Give writers a platform to share their ideas.', tone: '#FF5D5D', chip: 'bg-coral text-white' },
]

const journey = [
  { t: 'Discover', d: 'Browse curated shelves and categories.', icon: Search, tone: '#3654FF', onTone: '#FFFFFF' },
  { t: 'Read', d: 'Open any book, on any device.', icon: BookOpen, tone: '#FF5D5D', onTone: '#FFFFFF' },
  { t: 'Learn', d: 'Highlight, reflect, and remember.', icon: GraduationCap, tone: '#1F8A5B', onTone: '#FFFFFF' },
  { t: 'Grow', d: 'Build a library that grows with you.', icon: Sprout, tone: '#FFAE1F', onTone: '#14171B' },
]

export function About() {
  const { publicBooks } = useStore()
  const shelf = publicBooks.slice(0, 7)
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <InteractiveGrid className="[mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-page relative pt-16 pb-16 sm:pt-24">
          <p className="eyebrow">
            <span className="h-px w-6 bg-ink/30" aria-hidden />
            About Bookera
          </p>
          <h1 className="mt-4 max-w-4xl text-[clamp(2.75rem,8vw,6rem)] leading-[0.95] font-bold tracking-[-0.045em]">
            Built for <span className="text-indigo">curious</span> minds.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Bookera is a modern digital publishing platform. We bring together thoughtful writers and curious readers — with a catalogue designed for learning, a reading experience designed for focus, and a team that helps new voices get published.
          </p>
          {/* Shelf — each book lifts and tilts on hover */}
          <div className="no-scrollbar -mx-4 mt-14 flex items-end gap-4 overflow-x-auto px-4 pt-6 pb-4 sm:mx-0 sm:px-0">
            {shelf.map((b, i) => (
              <Link
                key={b.id}
                to={`/ebooks/${b.id}`}
                className={cx('group relative w-28 shrink-0 transition duration-500 ease-out hover:z-10 hover:-translate-y-4 hover:-rotate-2 sm:w-36', i % 2 ? 'translate-y-3' : '')}
                aria-label={b.title}
              >
                <BookCover title={b.title} category={b.category} cover={b.cover} size="sm" className="transition-shadow duration-500 group-hover:shadow-[0_28px_40px_-18px_rgb(20_23_27/0.55)]" />
                <span className="pointer-events-none absolute inset-x-2 -bottom-3 h-3 rounded-[50%] bg-ink/0 blur-md transition duration-500 group-hover:bg-ink/25" aria-hidden />
              </Link>
            ))}
          </div>
          <div className="h-3 rounded-full bg-ink/10" aria-hidden />
        </div>
      </section>

      <section className="container-page py-20 sm:py-28" aria-labelledby="pillars-title">
        <SectionHeader eyebrow="What we do" title={<span id="pillars-title">Four ideas, one platform.</span>} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ title, icon: Icon, text, tone, chip }, i) => (
            <div
              key={title}
              onMouseMove={trackSpotlight}
              className="group relative isolate overflow-hidden rounded-3xl border border-line bg-white p-7 shadow-card transition duration-500 ease-out hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--tone)_30%,transparent)] hover:shadow-[0_26px_50px_-24px_color-mix(in_srgb,var(--tone)_55%,transparent)]"
              style={{ ['--tone' as string]: tone }}
            >
              <Spotlight color={tone} size={320} strength={10} />
              <Icon
                className="pointer-events-none absolute -right-5 -bottom-5 -z-10 size-32 translate-x-3 translate-y-3 rotate-12 opacity-0 transition duration-700 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0 group-hover:opacity-[0.07]"
                style={{ color: tone }}
                strokeWidth={1.25}
                aria-hidden
              />
              <div className="flex items-center justify-between">
                <span className={cx('grid size-12 place-items-center rounded-2xl transition duration-500 ease-out group-hover:scale-110 group-hover:-rotate-6', chip)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-display text-sm font-bold text-muted transition-colors duration-300 group-hover:text-[var(--tone)]">0{i + 1}</span>
              </div>
              <h3 className="mt-8 text-2xl font-bold transition-transform duration-500 ease-out group-hover:translate-x-1">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted transition-colors duration-300 group-hover:text-ink-2">{text}</p>
              <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[var(--tone)] transition-transform duration-500 ease-out group-hover:scale-x-100" aria-hidden />
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-line bg-white py-20 sm:py-28" aria-labelledby="journey-title">
        <InteractiveGrid className="[mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_60%)]" />
        <div className="container-page relative">
          <p className="eyebrow">
            <span className="h-px w-6 bg-ink/30" aria-hidden />
            The reader’s journey
          </p>
          <h2 id="journey-title" className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">
            Every great library grows one book at a time.
          </h2>
          <ol className="mt-14 grid gap-4 md:grid-cols-4">
            {journey.map(({ t, d, icon: Icon, tone, onTone }, i, arr) => {
              return (
                <li key={t} className="relative">
                  <div
                    onMouseMove={trackSpotlight}
                    className="group relative isolate h-full overflow-hidden rounded-3xl border border-line bg-paper p-6 transition duration-500 ease-out hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--tone)_30%,transparent)] hover:bg-white hover:shadow-[0_28px_50px_-26px_color-mix(in_srgb,var(--tone)_55%,transparent)]"
                    style={{ ['--tone' as string]: tone, ['--on-tone' as string]: onTone }}
                  >
                    <Spotlight color={tone} size={300} strength={11} />
                    <span className="absolute inset-x-0 top-0 h-1 bg-[var(--tone)] opacity-70" aria-hidden />
                    <span className="font-display absolute top-5 right-6 text-sm font-bold text-muted transition-colors duration-300 group-hover:text-[var(--tone)]">0{i + 1}</span>
                    <span
                      className="grid size-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--tone)_12%,white)] text-[var(--tone)] transition duration-500 ease-out group-hover:scale-110 group-hover:-rotate-6 group-hover:bg-[var(--tone)] group-hover:text-[var(--on-tone)] group-hover:shadow-[0_10px_22px_-10px_var(--tone)]"
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <p className="mt-6 font-display text-3xl font-bold transition-transform duration-500 ease-out group-hover:translate-x-1">{t}</p>
                    <p className="mt-2 text-muted transition-colors duration-300 group-hover:text-ink-2">{d}</p>
                    <span className="mt-6 block h-px w-full bg-line" aria-hidden>
                      <span className="block h-px w-6 bg-[var(--tone)] transition-all duration-700 ease-out group-hover:w-full" />
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <span
                      className="absolute top-1/2 -right-3.5 z-10 hidden size-7 -translate-y-1/2 place-items-center rounded-full text-white shadow-[0_0_0_4px_#fff] md:grid"
                      style={{ background: `linear-gradient(135deg, ${tone}, ${arr[i + 1]!.tone})` }}
                      aria-hidden
                    >
                      <ArrowRight className="size-3.5" />
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="relative overflow-hidden py-20 text-center sm:py-28">
        <InteractiveGrid className="[mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
        <div className="container-page relative">
          <h2 className="mx-auto max-w-2xl text-4xl font-bold sm:text-5xl">Start your library today.</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted">Free to join. Hundreds of free titles. No clutter — just great books.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink to="/signup" size="lg">
              Create free account
            </ButtonLink>
            <ButtonLink to="/ebooks" variant="outline" size="lg">
              Explore E-books
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}

/* ─────────────────────────── 404 ─────────────────────────── */

export function NotFound() {
  return (
    <div className="container-page py-20">
      <EmptyState
        variant="search"
        title="Page not found"
        description="The page you’re looking for has moved or never existed. Let’s get you back to the books."
        action={
          <>
            <ButtonLink to="/">Go Home</ButtonLink>
            <ButtonLink to="/ebooks" variant="outline">
              Explore E-books
            </ButtonLink>
          </>
        }
      />
      <p className="mt-6 text-center text-sm text-muted">
        Want to publish a book? <Link to="/publish" className="font-medium text-indigo hover:underline">Talk to our team</Link>
      </p>
    </div>
  )
}
