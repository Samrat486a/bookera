import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Download, Loader2, Receipt } from 'lucide-react'
import type { Ebook, LibraryEntry } from '../../types'
import { getAuthor } from '../../data/authors'
import { useToast } from '../../context/ToastContext'
import { downloadBookPdf } from '../../lib/pdf/bookPdf'
import { cx, formatDate, formatPrice } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Button, ButtonLink } from '../ui/Button'
import { ProgressBar } from '../ui/States'
import { Spotlight, trackSpotlight } from '../ui/Spotlight'
import { BookCover } from '../ebooks/BookCover'

// eslint-disable-next-line react-refresh/only-export-components
export const libraryStatus = (p: number) => (p >= 100 ? 'Completed' : p > 0 ? 'Reading' : 'Not started')

/** A purchased e-book in the member's library. */
export function LibraryCard({ book, entry, className, style }: { book: Ebook; entry: LibraryEntry; className?: string; style?: CSSProperties }) {
  const author = getAuthor(book.authorId)
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)
  const status = libraryStatus(entry.progress)

  const download = async () => {
    setDownloading(true)
    try {
      await downloadBookPdf(book)
    } catch {
      toast({ title: 'Download failed', description: 'Please try again in a moment.', tone: 'error' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article
      onMouseMove={trackSpotlight}
      className={cx('group relative isolate flex flex-col overflow-hidden rounded-3xl border border-line bg-white p-4 shadow-card transition duration-500 ease-out hover:-translate-y-1 hover:border-indigo/25 hover:shadow-[0_26px_50px_-26px_rgb(54_84_255/0.45)] sm:p-5', className)}
      style={style}
    >
      <Spotlight size={360} strength={8} />
      <div className="flex gap-4 sm:gap-5">
        <Link to={`/read/${book.id}`} className="w-24 shrink-0 sm:w-28" aria-label={`Read ${book.title}`} tabIndex={-1}>
          <BookCover title={book.title} category={book.category} author={author?.name} cover={book.cover} image={book.coverImage} size="sm" className="transition duration-500 group-hover:-translate-y-1 group-hover:-rotate-2" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Badge tone={status === 'Completed' ? 'leaf' : status === 'Reading' ? 'indigo' : 'neutral'} dot className="self-start">
            {status}
          </Badge>
          <h3 className="mt-2 line-clamp-2 font-display text-lg leading-snug font-bold">
            <Link to={`/ebooks/${book.id}`} className="hover:text-indigo">
              {book.title}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted">{author?.name}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
            <Receipt className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              Bought {formatDate(entry.addedAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {entry.amount ? formatPrice(entry.amount) : 'Free'}
            </span>
          </p>
          <div className="mt-auto pt-3">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted">{entry.lastPage ? `Page ${entry.lastPage}` : 'Not opened yet'}</span>
              <span className="font-semibold tabular-nums">{entry.progress}%</span>
            </div>
            <ProgressBar value={entry.progress} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <ButtonLink to={`/read/${book.id}`} size="sm" className="flex-1">
          <BookOpen className="size-4" aria-hidden /> {status === 'Completed' ? 'Read again' : status === 'Reading' ? 'Continue' : 'Read now'}
        </ButtonLink>
        <Button size="sm" variant="outline" onClick={download} disabled={downloading} aria-label={`Download ${book.title} PDF`}>
          {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />} PDF
        </Button>
      </div>
      {entry.orderId && <p className="mt-2 text-[11px] text-muted/80">Order {entry.orderId}</p>}
    </article>
  )
}
