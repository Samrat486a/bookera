import type { Ebook } from '../../types'
import { getAuthor } from '../../data/authors'
import { ApiError, LIVE, api } from '../api'
import { slugify } from '../format'

/**
 * Returns the book's PDF bytes for the in-browser reader.
 * Live: streamed from the server (only for members who own the book).
 * Demo: a sample edition is generated on the fly.
 */
export async function loadBookPdf(book: Ebook): Promise<Uint8Array> {
  if (LIVE.commerce) {
    const res = await fetch(api.pdfUrl(book.id), { credentials: 'include' })
    if (!res.ok) {
      const msg = res.status === 403 ? 'This e-book isn’t in your library.' : res.status === 401 ? 'Please sign in to read this e-book.' : 'We couldn’t open this e-book. Please try again.'
      throw new ApiError(msg, res.status)
    }
    return new Uint8Array(await res.arrayBuffer())
  }
  const { generateDemoPdf } = await import('./demoPdf')
  return generateDemoPdf(book, getAuthor(book.authorId)?.name ?? 'Bookera')
}

/** Saves the PDF to the member's device. */
export async function downloadBookPdf(book: Ebook) {
  if (LIVE.commerce) {
    // The server replies with Content-Disposition: attachment.
    window.location.href = api.pdfUrl(book.id, true)
    return
  }
  const bytes = await loadBookPdf(book)
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(book.title)}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
