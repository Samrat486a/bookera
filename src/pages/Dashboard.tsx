import { useMemo, useState } from 'react'
import { BookMarked, BookOpen, CheckCircle2, Layers, Plus, ShoppingBag } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { getAuthor } from '../data/authors'
import { cx, formatPrice } from '../lib/format'
import type { Ebook, LibraryEntry } from '../types'
import { RequireRole } from '../components/layout/Layouts'
import { StatCard } from '../components/dashboard/DashboardCard'
import { LibraryCard, libraryStatus } from '../components/cards/LibraryCard'
import { BookCover } from '../components/ebooks/BookCover'
import { ButtonLink, Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/States'
import { InteractiveGrid } from '../components/ui/InteractiveGrid'
import { Spotlight, trackSpotlight } from '../components/ui/Spotlight'

const filters = ['All', 'Reading', 'Not started', 'Completed'] as const

function MemberDashboard() {
  const { user, library, getBook } = useStore()
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')

  const items = useMemo(
    () =>
      library
        .map((entry) => ({ entry, book: getBook(entry.bookId) }))
        .filter((x): x is { entry: LibraryEntry; book: Ebook } => !!x.book)
        .sort((a, b) => b.entry.addedAt.localeCompare(a.entry.addedAt)),
    [library, getBook],
  )
  const shown = items.filter((x) => filter === 'All' || libraryStatus(x.entry.progress) === filter)
  const reading = items.filter((x) => x.entry.progress > 0 && x.entry.progress < 100)
  const completed = items.filter((x) => x.entry.progress >= 100)
  const categoriesExplored = new Set(items.map((x) => x.book.category)).size
  const spent = items.reduce((s, x) => s + (x.entry.amount ?? 0), 0)
  const current = [...reading].sort((a, b) => b.entry.progress - a.entry.progress)[0]
  const firstName = user?.name.split(' ')[0] ?? 'Reader'

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <InteractiveGrid className="[mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-page relative flex flex-col gap-6 pt-10 pb-10 sm:flex-row sm:items-end sm:justify-between sm:pt-14">
          <div>
            <p className="eyebrow">
              <span className="h-px w-6 bg-ink/30" aria-hidden />
              Member library
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Welcome back, {firstName}!</h1>
            <p className="mt-2 text-lg text-muted">Every e-book you’ve bought — ready to read online or download.</p>
          </div>
          <ButtonLink to="/ebooks" variant="dark">
            <Plus className="size-4" aria-hidden /> Find more e-books
          </ButtonLink>
        </div>
      </section>

      <div className="container-page py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Books Owned" value={items.length} icon={BookMarked} tone="ink" hint={spent ? `${formatPrice(spent)} invested in learning` : 'Your personal shelf'} />
          <StatCard label="Currently Reading" value={reading.length} icon={BookOpen} tone="indigo" hint="In progress" />
          <StatCard label="Categories Explored" value={categoriesExplored} icon={Layers} tone="saffron" hint="Across your shelf" />
          <StatCard label="Books Completed" value={completed.length} icon={CheckCircle2} tone="leaf" hint="Finished cover to cover" />
        </div>

        {current && (
          <section
            onMouseMove={trackSpotlight}
            className="group relative isolate mt-8 overflow-hidden rounded-[32px] border border-line bg-white p-6 shadow-card transition duration-500 hover:shadow-[0_30px_60px_-30px_rgb(54_84_255/0.5)] sm:p-8"
            aria-label="Continue reading"
          >
            <Spotlight size={520} strength={9} />
            <div className="bg-dots pointer-events-none absolute inset-y-0 right-0 -z-10 w-1/2 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <BookCover title={current.book.title} category={current.book.category} cover={current.book.cover} image={current.book.coverImage} size="sm" className="w-28 shrink-0 transition duration-500 group-hover:-translate-y-1 group-hover:-rotate-2 sm:w-32" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-[0.14em] text-indigo uppercase">Continue reading</p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{current.book.title}</h2>
                <p className="mt-1 text-muted">
                  {getAuthor(current.book.authorId)?.name} · {current.entry.lastPage ? `Page ${current.entry.lastPage}` : 'Just started'}
                </p>
                <div className="mt-5 flex max-w-md items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-linear-to-r from-indigo to-[#6B83FF] transition-[width] duration-700" style={{ width: `${current.entry.progress}%` }} />
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{current.entry.progress}%</span>
                </div>
              </div>
              <ButtonLink to={`/read/${current.book.id}`} size="lg">
                <BookOpen className="size-4" aria-hidden /> Continue reading
              </ButtonLink>
            </div>
          </section>
        )}

        <section className="mt-14" aria-labelledby="library-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="library-title" className="text-3xl font-bold">
                My Library
              </h2>
              <p className="mt-1 text-muted">
                {items.length} {items.length === 1 ? 'e-book' : 'e-books'} purchased · read online or download the PDF
              </p>
            </div>
            {items.length > 0 && (
              <div role="tablist" aria-label="Filter library" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
                {filters.map((f) => {
                  const count = f === 'All' ? items.length : items.filter((x) => libraryStatus(x.entry.progress) === f).length
                  return (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={filter === f}
                      onClick={() => setFilter(f)}
                      className={cx(
                        'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition duration-300 hover:-translate-y-0.5',
                        filter === f ? 'bg-ink text-paper shadow-[0_8px_18px_-10px_rgb(20_23_27/0.7)]' : 'border border-line bg-white text-ink-2 hover:border-ink/25 hover:shadow-[0_10px_20px_-14px_rgb(20_23_27/0.4)]',
                      )}
                    >
                      {f}
                      <span className={cx('rounded-full px-1.5 text-xs', filter === f ? 'bg-paper/20' : 'bg-paper-2')}>{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-8">
            {items.length === 0 ? (
              <EmptyState
                title="No books in your library yet"
                description="Your next great read is waiting for you. Books you buy appear here instantly."
                action={
                  <ButtonLink to="/ebooks">
                    <ShoppingBag className="size-4" aria-hidden /> Explore E-books
                  </ButtonLink>
                }
              />
            ) : shown.length === 0 ? (
              <EmptyState variant="search" title={`No “${filter}” books`} description="Try another filter to see the rest of your shelf." action={<Button variant="outline" onClick={() => setFilter('All')}>Show all</Button>} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {shown.map(({ book, entry }, i) => (
                  <LibraryCard key={book.id} book={book} entry={entry} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <RequireRole role="any">
      <MemberDashboard />
    </RequireRole>
  )
}
