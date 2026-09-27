import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, Calendar, Check, ChevronRight, FileText, Gauge, Globe, Hash, Share2, Users } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { getAuthor } from '../data/authors'
import { formatDate, formatNumber, formatPrice } from '../lib/format'
import { BookCover } from '../components/ebooks/BookCover'
import { EbookCard } from '../components/ebooks/EbookCard'
import { EbookGrid } from '../components/ebooks/EbookGrid'
import { BuyButton } from '../components/ebooks/BuyButton'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Avatar, EmptyState, Rating } from '../components/ui/States'
import { InteractiveGrid } from '../components/ui/InteractiveGrid'

const sampleReviews = [
  { name: 'Ananya R.', rating: 5, date: '2026-09-02', text: 'Clear, practical, and genuinely enjoyable to read. I finished it in a weekend and have already recommended it to my study group.' },
  { name: 'James C.', rating: 5, date: '2026-08-18', text: 'The examples are excellent. Every chapter felt like it respected my time.' },
  { name: 'Meera I.', rating: 4, date: '2026-07-27', text: 'Beautifully written with a great structure. A couple of sections could go deeper, but overall a fantastic read.' },
]

export default function EbookDetails() {
  const { id = '' } = useParams()
  const { getBook, publicBooks, catalogReady } = useStore()
  const toast = useToast()
  const book = getBook(id)

  const related = useMemo(
    () => (book ? publicBooks.filter((b) => b.id !== book.id && (b.category === book.category || b.authorId === book.authorId)).slice(0, 3) : []),
    [book, publicBooks],
  )

  if (!book && !catalogReady) {
    return (
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,440px)_1fr]" aria-busy="true">
        <div className="skeleton aspect-[1/1.05] rounded-[32px]" />
        <div className="space-y-4 pt-4">
          <div className="skeleton h-6 w-32 rounded-full" />
          <div className="skeleton h-14 w-4/5 rounded-2xl" />
          <div className="skeleton h-5 w-1/2 rounded-lg" />
          <div className="skeleton h-40 w-full rounded-3xl" />
        </div>
      </div>
    )
  }
  if (!book || book.status !== 'published') {
    return (
      <div className="container-page py-20">
        <EmptyState
          variant="search"
          title="This e-book isn’t available"
          description="It may have been unpublished or the link is incorrect."
          action={<ButtonLink to="/ebooks">Browse E-books</ButtonLink>}
        />
      </div>
    )
  }

  const author = getAuthor(book.authorId)
  const meta = [
    { icon: Calendar, label: 'Published', value: formatDate(book.publishedAt) },
    { icon: BookOpen, label: 'Pages', value: `${book.pages}` },
    { icon: FileText, label: 'Format', value: book.format },
    { icon: Globe, label: 'Language', value: book.language },
    { icon: Gauge, label: 'Reading level', value: book.level },
    { icon: Hash, label: 'ISBN', value: book.isbn },
  ]
  const distribution = [72, 19, 6, 2, 1]

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <InteractiveGrid className="[mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-page relative pt-8 pb-14 sm:pb-20">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/ebooks" className="hover:text-ink">
                  E-books
                </Link>
              </li>
              <ChevronRight className="size-3.5" aria-hidden />
              <li>
                <Link to={`/ebooks?category=${encodeURIComponent(book.category)}`} className="hover:text-ink">
                  {book.category}
                </Link>
              </li>
              <ChevronRight className="size-3.5" aria-hidden />
              <li aria-current="page" className="max-w-[16rem] truncate text-ink">
                {book.title}
              </li>
            </ol>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-16">
            {/* Cover stage */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[32px] border border-line sm:aspect-[16/10] lg:aspect-[1/1.05]"
                style={{ background: `color-mix(in srgb, ${book.cover.bg} 12%, #F6F4EE)` }}
              >
                <div className="bg-dots absolute inset-0 opacity-50" aria-hidden />
                <div className="absolute bottom-[8%] left-1/2 h-10 w-1/2 -translate-x-1/2 rounded-[50%] bg-ink/15 blur-xl" aria-hidden />
                <BookCover
                  title={book.title}
                  subtitle={book.subtitle}
                  author={author?.name}
                  category={book.category}
                  cover={book.cover}
                  image={book.coverImage}
                  size="lg"
                  className="w-[38%] animate-pop-in sm:w-[30%] lg:w-[52%]"
                />
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 animate-fade-up">
              <div className="flex flex-wrap gap-2">
                <Badge tone="indigo">{book.category}</Badge>
                {book.featured && <Badge tone="saffron">Featured</Badge>}
                {!book.available && (
                  <Badge tone="coral" dot>
                    Currently Unavailable
                  </Badge>
                )}
              </div>
              <h1 className="mt-4 text-[2.4rem] leading-[1.02] font-bold tracking-[-0.035em] sm:text-6xl">{book.title}</h1>
              {book.subtitle && <p className="mt-2 font-display text-xl text-ink-2">{book.subtitle}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
                <Link to={`/ebooks?author=${author?.id}`} className="inline-flex items-center gap-2 font-medium hover:text-indigo">
                  {author && <Avatar name={author.name} tone={author.tone} size="sm" />}
                  By {author?.name}
                </Link>
                <Rating value={book.rating} reviews={book.reviews} />
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <Users className="size-4" aria-hidden /> {formatNumber(book.readers)} readers
                </span>
              </div>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">{book.description}</p>

              {/* Purchase card */}
              <div className="mt-8 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted">{book.price === 0 ? 'Free for members' : 'One-time price · Lifetime access'}</p>
                    <p className="mt-1 font-display text-4xl font-bold">{formatPrice(book.price)}</p>
                  </div>
                  <p className="text-sm text-muted">PDF · Read online or download · Emailed to you</p>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <BuyButton book={book} className="sm:flex-1" />
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href).catch(() => {})
                      toast({ title: 'Link copied', description: 'Share this e-book with a friend.', tone: 'info' })
                    }}
                  >
                    <Share2 className="size-4" aria-hidden /> Share
                  </Button>
                </div>
                {!book.available && <p className="mt-3 text-sm text-coral-700">This title is temporarily unavailable while the publisher updates it. Check back soon.</p>}
              </div>

              {/* Meta */}
              <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
                {meta.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white p-4 sm:p-5">
                    <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
                      <Icon className="size-3.5" aria-hidden /> {label}
                    </dt>
                    <dd className="mt-1.5 truncate font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              {/* About */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold">About this e-book</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{book.longDescription}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {book.tags.map((t) => (
                    <Link key={t} to={`/ebooks?q=${encodeURIComponent(t)}`} className="rounded-full border border-line bg-white px-3 py-1 text-[13px] text-ink-2 hover:border-line-2 hover:text-ink">
                      #{t}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-12">
                <h2 className="text-2xl font-bold">What you’ll learn</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {book.learn.map((l) => (
                    <li key={l} className="flex gap-3 rounded-2xl border border-line bg-white p-4 text-[15px]">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-leaf text-white">
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                      {l}
                    </li>
                  ))}
                </ul>
              </div>

              {book.requirements && book.requirements.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold">Requirements</h2>
                  <ul className="mt-4 space-y-2 text-[15px] text-ink-2">
                    {book.requirements.map((r) => (
                      <li key={r} className="flex items-center gap-3">
                        <span className="size-1.5 rounded-full bg-saffron" aria-hidden /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reviews */}
              {book.rating > 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold">Reader reviews</h2>
                  <div className="mt-5 grid gap-6 rounded-3xl border border-line bg-white p-6 sm:grid-cols-[180px_1fr] sm:p-8">
                    <div>
                      <p className="font-display text-6xl font-bold">{book.rating.toFixed(1)}</p>
                      <Rating value={book.rating} className="mt-1" />
                      <p className="mt-1 text-sm text-muted">{book.reviews.toLocaleString('en-IN')} ratings</p>
                    </div>
                    <div className="space-y-2">
                      {distribution.map((pct, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-3 text-muted">{5 - i}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
                            <div className="h-full rounded-full bg-saffron" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-9 text-right text-muted tabular-nums">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ul className="mt-4 space-y-4">
                    {sampleReviews.map((r) => (
                      <li key={r.name} className="rounded-3xl border border-line bg-white p-6">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.name} tone="#EFECE3" size="sm" />
                            <div>
                              <p className="text-sm font-semibold">{r.name}</p>
                              <p className="text-xs text-muted">{formatDate(r.date)}</p>
                            </div>
                          </div>
                          <span className="text-sm text-saffron" aria-label={`${r.rating} out of 5 stars`}>
                            {'★'.repeat(r.rating)}
                            <span className="text-line-2">{'★'.repeat(5 - r.rating)}</span>
                          </span>
                        </div>
                        <p className="mt-3 leading-relaxed text-ink-2">{r.text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-page py-16 sm:py-20" aria-labelledby="related-title">
          <div className="flex items-end justify-between gap-4">
            <h2 id="related-title" className="text-3xl font-bold sm:text-4xl">
              You might also like
            </h2>
            <ButtonLink to={`/ebooks?category=${encodeURIComponent(book.category)}`} variant="outline" size="sm" className="hidden sm:inline-flex">
              More in {book.category}
            </ButtonLink>
          </div>
          <EbookGrid className="mt-8">
            {related.map((b) => (
              <EbookCard key={b.id} book={b} />
            ))}
          </EbookGrid>
        </section>
      )}
    </>
  )
}
