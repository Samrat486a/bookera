import { useState } from 'react'
import { BookOpen, Clock, Download, Loader2, Lock, ShoppingBag, Sparkles } from 'lucide-react'
import type { Ebook } from '../../types'
import { useStore } from '../../context/StoreContext'
import { useToast } from '../../context/ToastContext'
import { SALES_OPEN } from '../../lib/api'
import { downloadBookPdf } from '../../lib/pdf/bookPdf'
import { cx, formatPrice } from '../../lib/format'
import { Button, ButtonLink } from '../ui/Button'

/** Primary purchase CTA: Buy / Get free → checkout, or Read / Download when owned. */
export function BuyButton({ book, className }: { book: Ebook; className?: string }) {
  const { isInLibrary } = useStore()
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)

  if (isInLibrary(book.id)) {
    return (
      <div className={cx('flex flex-1 flex-col gap-3 sm:flex-row', className)}>
        <ButtonLink to={`/read/${book.id}`} size="lg" variant="dark" className="sm:flex-1">
          <BookOpen className="size-4" aria-hidden /> Read now
        </ButtonLink>
        <Button
          size="lg"
          variant="outline"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true)
            try {
              await downloadBookPdf(book)
            } catch {
              toast({ title: 'Download failed', description: 'Please try again.', tone: 'error' })
            } finally {
              setDownloading(false)
            }
          }}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />} PDF
        </Button>
      </div>
    )
  }

  if (!book.available) {
    return (
      <Button size="lg" disabled className={cx('bg-paper-2 text-muted shadow-none', className)} aria-disabled>
        <Lock className="size-4" aria-hidden /> Currently Unavailable
      </Button>
    )
  }

  if (!SALES_OPEN) {
    return (
      <Button size="lg" disabled className={cx('bg-paper-2 text-muted shadow-none', className)} aria-disabled>
        <Clock className="size-4" aria-hidden /> Sales open soon · {book.price === 0 ? 'Free' : formatPrice(book.price)}
      </Button>
    )
  }

  return (
    <ButtonLink to={`/checkout/${book.id}`} size="lg" className={className}>
      {book.price === 0 ? <Sparkles className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
      {book.price === 0 ? 'Get this e-book — Free' : `Buy this e-book · ${formatPrice(book.price)}`}
    </ButtonLink>
  )
}
