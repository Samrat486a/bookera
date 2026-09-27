import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookmarkCheck, FileText } from 'lucide-react'
import type { Ebook } from '../../types'
import { getAuthor } from '../../data/authors'
import { cx, formatPrice, yearOf } from '../../lib/format'
import { useStore } from '../../context/StoreContext'
import { Badge } from '../ui/Badge'
import { Rating } from '../ui/States'
import { BookCover } from './BookCover'

export function EbookCard({ book, className, style }: { book: Ebook; className?: string; style?: CSSProperties }) {
  const author = getAuthor(book.authorId)
  const { isInLibrary } = useStore()
  const owned = isInLibrary(book.id)

  return (
    <Link
      to={`/ebooks/${book.id}`}
      className={cx(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-lift focus-visible:-translate-y-1',
        className,
      )}
      style={style}
      aria-label={`${book.title} by ${author?.name ?? 'Unknown author'}`}
    >
      {/* Cover stage */}
      <div
        className="relative flex aspect-[4/3.3] items-center justify-center overflow-hidden"
        style={{ background: `color-mix(in srgb, ${book.cover.bg} 11%, #F6F4EE)` }}
      >
        <div className="absolute inset-0 bg-dots opacity-50" aria-hidden />
        <div className="absolute -bottom-10 left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-[50%] bg-ink/10 blur-xl" aria-hidden />
        <BookCover
          title={book.title}
          subtitle={book.subtitle}
          author={author?.name}
          category={book.category}
          cover={book.cover}
          image={book.coverImage}
          className="w-[42%] transition duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.045] group-hover:-rotate-1"
        />
        <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
          {book.featured && <Badge tone="saffron">Featured</Badge>}
          {book.price === 0 && <Badge tone="leaf">Free</Badge>}
        </div>
        {owned && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-paper">
            <BookmarkCheck className="size-3.5" aria-hidden /> Owned
          </span>
        )}
        {!book.available && (
          <span className="absolute inset-x-4 bottom-4 rounded-xl bg-coral px-3 py-1.5 text-center text-xs font-semibold text-white">Currently Unavailable</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-indigo uppercase">{book.category}</span>
        <h3 className="mt-2 font-display text-xl leading-snug font-bold text-ink">{book.title}</h3>
        <p className="mt-1 text-sm text-muted">By {author?.name}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-2">{book.description}</p>

        <dl className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
          <div className="flex items-center">
            <dt className="sr-only">Rating</dt>
            <dd>
              <Rating value={book.rating} />
            </dd>
          </div>
          <span aria-hidden className="size-1 rounded-full bg-line-2" />
          <div>
            <dt className="sr-only">Pages</dt>
            <dd>{book.pages} pages</dd>
          </div>
          <span aria-hidden className="size-1 rounded-full bg-line-2" />
          <div>
            <dt className="sr-only">Published</dt>
            <dd>{yearOf(book.publishedAt)}</dd>
          </div>
          <span aria-hidden className="size-1 rounded-full bg-line-2" />
          <div className="flex items-center gap-1">
            <dt className="sr-only">Format</dt>
            <FileText className="size-3.5" aria-hidden />
            <dd>{book.format}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-5">
        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className={cx('font-display text-lg font-bold', book.price === 0 ? 'text-leaf' : 'text-ink')}>{formatPrice(book.price)}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition group-hover:text-indigo">
            View Details
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
        </div>
      </div>
    </Link>
  )
}
