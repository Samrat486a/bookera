import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { getAuthor } from '../../data/authors'
import { ButtonLink } from '../ui/Button'
import { BookCover } from '../ebooks/BookCover'
import { InteractiveGrid } from '../ui/InteractiveGrid'

const trending = ['JavaScript', 'AI', 'Focus', 'Startups', 'Investing']

function ReaderDevice() {
  const lines = [92, 100, 86, 97, 64, 0, 95, 100, 88, 100, 72]
  return (
    <div className="relative rounded-[30px] bg-ink p-2.5 shadow-lift sm:p-3" aria-hidden>
      <div className="absolute top-1/2 -left-[3px] h-10 w-[3px] -translate-y-1/2 rounded-l bg-ink-2" />
      <div className="overflow-hidden rounded-[22px] bg-[#FBFAF6]">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[9px] font-semibold tracking-[0.12em] text-muted uppercase sm:text-[10px]">
          <span>Modern JavaScript</span>
          <span>Ch. 4</span>
        </div>
        <div className="px-4 pt-4 pb-5 sm:px-5">
          <p className="text-[9px] font-semibold tracking-[0.14em] text-indigo uppercase sm:text-[10px]">Chapter four</p>
          <p className="mt-1 font-display text-[15px] leading-tight font-bold text-ink sm:text-lg">Inside the Event Loop</p>
          <div className="mt-3 space-y-[7px]">
            {lines.map((w, i) =>
              w === 0 ? (
                <div key={i} className="h-1.5" />
              ) : (
                <div key={i} className="relative h-[5px] rounded-full bg-ink/12" style={{ width: `${w}%` }}>
                  {i === 7 && <span className="absolute -inset-y-[3px] -left-1 w-[70%] rounded bg-saffron/45" />}
                </div>
              ),
            )}
          </div>
          <div className="mt-5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full w-[64%] rounded-full bg-indigo" />
            </div>
            <span className="text-[9px] font-semibold text-muted sm:text-[10px]">64%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const { getBook } = useStore()
  const covers = ['ai-and-the-future-of-technology', 'the-lantern-house', 'interface-systems', 'the-learning-code']
    .map((id) => getBook(id))
    .filter((b) => !!b)

  return (
    <section className="relative overflow-hidden">
      <InteractiveGrid className="[mask-image:radial-gradient(ellipse_at_70%_40%,black_20%,transparent_70%)]" />
      <div className="container-page relative grid items-center gap-14 pt-12 pb-20 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-20 lg:pb-28">
        {/* Copy */}
        <div className="animate-fade-up">
          <Link
            to="/ebooks?sort=newest"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 py-1 pr-3 pl-1 text-[13px] font-medium text-ink-2 shadow-card transition hover:border-line-2"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-paper">
              <Sparkles className="size-3 text-saffron" aria-hidden /> New
            </span>
            Fresh titles added every week
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>

          <h1 className="mt-7 text-[clamp(3rem,8.5vw,6.25rem)] leading-[0.92] font-bold tracking-[-0.045em]">
            Discover.
            <br />
            <span className="relative inline-block">
              Read.
              <svg viewBox="0 0 200 20" className="absolute -bottom-2 left-0 h-3 w-full text-saffron sm:-bottom-3 sm:h-4" preserveAspectRatio="none" aria-hidden>
                <path d="M3 14C50 5 120 3 197 9" pathLength={1} className="animate-draw [stroke-dasharray:1_1]" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>{' '}
            <span className="text-indigo">Learn.</span>
          </h1>

          <p className="mt-7 font-display text-xl font-medium text-ink sm:text-2xl">Your digital library for stories, ideas, and knowledge.</p>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-muted sm:text-[17px]">
            Explore beautifully crafted e-books across technology, education, business, fiction, self-development, and more. Discover new ideas, expand your knowledge, and build your personal digital library.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/ebooks" size="lg">
              Explore E-books <ArrowRight className="size-4 transition group-hover/btn:translate-x-0.5" aria-hidden />
            </ButtonLink>
            <ButtonLink to="/categories" variant="outline" size="lg">
              Explore Categories
            </ButtonLink>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-muted">Trending:</span>
            {trending.map((t) => (
              <Link
                key={t}
                to={`/ebooks?q=${encodeURIComponent(t)}`}
                className="rounded-full border border-line bg-white/70 px-3 py-1 font-medium text-ink-2 transition hover:border-ink/30 hover:text-ink"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>

        {/* Visual composition */}
        <div className="relative mx-auto w-full max-w-[540px] animate-fade-up [animation-delay:120ms]" aria-label="Floating e-book covers around a digital reader" role="img">
          <div className="relative aspect-[1/1.02]">
            <div className="absolute inset-[6%] rounded-[44px] border border-line bg-white/70 shadow-card" aria-hidden>
              <div className="bg-dots absolute inset-0 rounded-[44px] opacity-40" />
            </div>
            <div className="absolute top-[22%] left-[42%] size-[48%] rounded-full bg-saffron/90" aria-hidden />
            <svg className="absolute top-[9%] right-[10%] size-10 text-indigo" viewBox="0 0 40 40" aria-hidden>
              <path d="M20 2v36M2 20h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="absolute bottom-[12%] left-[8%] size-12 rounded-xl border-2 border-dashed border-ink/25" aria-hidden />

            {/* Device */}
            <div className="absolute top-[14%] left-1/2 w-[48%] -translate-x-1/2">
              <ReaderDevice />
            </div>

            {/* Floating covers */}
            {covers[0] && (
              <div className="absolute top-[4%] left-[3%] w-[27%] animate-float [--r:-9deg]">
                <BookCover title={covers[0].title} category={covers[0].category} author={getAuthor(covers[0].authorId)?.name} cover={covers[0].cover} size="sm" />
              </div>
            )}
            {covers[1] && (
              <div className="absolute right-[2%] bottom-[16%] w-[28%] animate-float [--r:8deg] [animation-delay:-2.5s]">
                <BookCover title={covers[1].title} category={covers[1].category} author={getAuthor(covers[1].authorId)?.name} cover={covers[1].cover} size="sm" />
              </div>
            )}
            {covers[2] && (
              <div className="absolute bottom-[2%] left-[16%] w-[22%] animate-float [--r:-4deg] [animation-delay:-4s]">
                <BookCover title={covers[2].title} category={covers[2].category} cover={covers[2].cover} size="sm" />
              </div>
            )}

            {/* Floating UI chips */}
            <div className="absolute top-[40%] -left-1 hidden animate-float items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-lift [animation-delay:-1s] sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-leaf-50 text-sm" aria-hidden>
                📚
              </span>
              <div className="leading-tight">
                <p className="text-[11px] text-muted">Added to library</p>
                <p className="text-[13px] font-semibold">The Learning Code</p>
              </div>
            </div>
            <div className="absolute top-[6%] right-[1%] flex animate-float items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 shadow-lift [animation-delay:-3s]">
              <svg viewBox="0 0 20 20" className="size-4 fill-saffron" aria-hidden>
                <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
              </svg>
              <span className="text-[13px] font-semibold">4.9</span>
              <span className="text-[11px] text-muted">avg. rating</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
