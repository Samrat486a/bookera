import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { useToast } from '../../context/ToastContext'
import { getAuthor } from '../../data/authors'
import { cx, formatDate, formatNumber } from '../../lib/format'
import type { BookStatus, Ebook } from '../../types'
import { PageHeader } from '../../components/layout/Layouts'
import { BookCover } from '../../components/ebooks/BookCover'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/States'

const statusTabs = ['All', 'Published', 'Draft', 'Unpublished'] as const

function StatusBadge({ book }: { book: Ebook }) {
  const main =
    book.status === 'draft' ? (
      <Badge tone="saffron" dot>Draft</Badge>
    ) : book.status === 'unpublished' ? (
      <Badge tone="neutral" dot>Unpublished</Badge>
    ) : !book.available ? (
      <Badge tone="coral" dot>Unavailable</Badge>
    ) : (
      <Badge tone="leaf" dot>Published</Badge>
    )
  if (book.hasFile !== false) return main
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {main}
      <span title="No e-book file uploaded — buyers would receive nothing. Edit the book to upload one.">
        <Badge tone="coral">No file</Badge>
      </span>
    </span>
  )
}

function RowActions({ book, onUnpublish, onPublish, onDelete }: { book: Ebook; onUnpublish: () => void; onPublish: () => void; onDelete: () => void }) {
  const btn = 'grid size-9 place-items-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink'
  return (
    <div className="flex items-center justify-end gap-1">
      <Link to={`/admin/books/${book.id}/edit`} className={btn} aria-label={`Edit ${book.title}`} title="Edit">
        <Pencil className="size-4" />
      </Link>
      {book.status === 'published' ? (
        <button onClick={onUnpublish} className={btn} aria-label={`Unpublish ${book.title}`} title="Unpublish">
          <EyeOff className="size-4" />
        </button>
      ) : (
        <button onClick={onPublish} className={cx(btn, 'hover:text-leaf')} aria-label={`Publish ${book.title}`} title="Publish">
          <Eye className="size-4" />
        </button>
      )}
      <button onClick={onDelete} className={cx(btn, 'hover:bg-coral-50 hover:text-coral-700')} aria-label={`Delete ${book.title}`} title="Delete">
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

export default function ManageBooks() {
  const { books, setBookStatus, removeBook } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<(typeof statusTabs)[number]>('All')
  const [unpublishId, setUnpublishId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const list = books.filter((b) => {
    if (tab !== 'All' && b.status !== (tab.toLowerCase() as BookStatus)) return false
    const s = q.trim().toLowerCase()
    return !s || `${b.title} ${b.category} ${getAuthor(b.authorId)?.name}`.toLowerCase().includes(s)
  })
  const target = books.find((b) => b.id === (unpublishId ?? deleteId))

  const fail = (err: unknown, fallback: string) =>
    toast({ title: (err as { code?: string }).code === 'FILE_REQUIRED' ? 'E-book file needed' : fallback, description: err instanceof Error ? err.message : 'Please try again.', tone: 'error' })

  const publish = async (b: Ebook) => {
    try {
      await setBookStatus(b, { status: 'published' })
      toast({ title: 'E-book published', description: `“${b.title}” is now live.` })
    } catch (err) {
      fail(err, 'Couldn’t publish')
    }
  }
  const actions = (b: Ebook) => ({
    onUnpublish: () => setUnpublishId(b.id),
    onPublish: () => publish(b),
    onDelete: () => setDeleteId(b.id),
  })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Catalogue"
        title="E-books"
        description="Create, edit, and manage every title in your catalogue."
        actions={
          <ButtonLink to="/admin/books/new">
            <Plus className="size-4" aria-hidden /> Add E-book
          </ButtonLink>
        }
      />

      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter by status" className="no-scrollbar flex gap-2 overflow-x-auto">
          {statusTabs.map((t) => {
            const count = t === 'All' ? books.length : books.filter((b) => b.status === t.toLowerCase()).length
            return (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cx(
                  'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition',
                  tab === t ? 'bg-ink text-paper' : 'border border-line bg-white text-ink-2 hover:border-line-2',
                )}
              >
                {t} <span className={cx('rounded-full px-1.5 text-xs', tab === t ? 'bg-paper/20' : 'bg-paper-2')}>{count}</span>
              </button>
            )
          })}
        </div>
        <div className="relative lg:w-80">
          <label htmlFor="book-search" className="sr-only">
            Search e-books
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="book-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, category, author..."
            className="h-11 w-full rounded-full border border-line-2 bg-white pr-4 pl-10 text-sm transition focus:border-indigo focus:ring-4 focus:ring-indigo/12 focus:outline-none"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState className="mt-6" variant="search" title="No e-books found" description="Try a different search or status filter." action={<ButtonLink to="/admin/books/new">+ Add E-book</ButtonLink>} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-3xl border border-line bg-white shadow-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="border-b border-line bg-paper/60 text-xs tracking-wide text-muted uppercase">
                  <tr>
                    {['E-book', 'Category', 'Author', 'Publication Date', 'Format', 'Pages', 'Readers', 'Status'].map((h) => (
                      <th key={h} scope="col" className="px-3 py-3.5 font-semibold whitespace-nowrap first:pl-6">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="sticky right-0 bg-[#FAF9F5] py-3.5 pr-6 pl-2 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((b) => (
                    <tr key={b.id} className="group transition hover:bg-[#FAF9F5]">
                      <td className="py-3 pr-4 pl-6">
                        <div className="flex items-center gap-3">
                          <BookCover title={b.title} cover={b.cover} image={b.coverImage} size="sm" className="w-9 shrink-0" />
                          <span className="max-w-[180px] truncate font-semibold text-ink">{b.title}</span>
                        </div>
                      </td>
                      <td className="max-w-[150px] px-3 text-ink-2">{b.category}</td>
                      <td className="px-3 whitespace-nowrap text-ink-2">{getAuthor(b.authorId)?.name}</td>
                      <td className="px-3 whitespace-nowrap text-ink-2">{formatDate(b.publishedAt)}</td>
                      <td className="px-3 text-ink-2">{b.format}</td>
                      <td className="px-3 text-ink-2 tabular-nums">{b.pages}</td>
                      <td className="px-3 font-semibold tabular-nums">{formatNumber(b.readers)}</td>
                      <td className="px-3">
                        <StatusBadge book={b} />
                      </td>
                      <td className="sticky right-0 bg-white py-3 pr-5 pl-2 shadow-[-12px_0_12px_-12px_rgb(20_23_27/0.15)] transition group-hover:bg-[#FAF9F5]">
                        <RowActions book={b} {...actions(b)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="mt-6 space-y-3 md:hidden">
            {list.map((b) => (
              <li key={b.id} className="rounded-3xl border border-line bg-white p-4 shadow-card">
                <div className="flex gap-4">
                  <BookCover title={b.title} cover={b.cover} image={b.coverImage} size="sm" className="w-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <StatusBadge book={b} />
                    <p className="mt-2 font-display font-bold leading-snug">{b.title}</p>
                    <p className="truncate text-xs text-muted">
                      {getAuthor(b.authorId)?.name} · {b.category}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-paper p-3 text-xs">
                  {[
                    ['Date', formatDate(b.publishedAt, { month: 'short', year: 'numeric' })],
                    ['Format', b.format],
                    ['Pages', b.pages],
                    ['Readers', formatNumber(b.readers)],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-muted">{k}</dt>
                      <dd className="mt-0.5 font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3">
                  <RowActions book={b} {...actions(b)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmModal
        open={!!unpublishId}
        onClose={() => setUnpublishId(null)}
        tone="dark"
        icon={
          <span className="grid size-12 place-items-center rounded-2xl bg-paper-2">
            <EyeOff className="size-5" />
          </span>
        }
        title="Unpublish this e-book?"
        description="This will remove the e-book from public discovery."
        cancelLabel="Keep Published"
        confirmLabel="Unpublish"
        onConfirm={async () => {
          if (!target) return
          try {
            await setBookStatus(target, { status: 'unpublished' })
            toast({ title: 'E-book unpublished', description: `“${target.title}” is hidden from readers.`, tone: 'info' })
          } catch (err) {
            fail(err, 'Couldn’t unpublish')
          }
        }}
      />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        icon={
          <span className="grid size-12 place-items-center rounded-2xl bg-coral-50 text-coral">
            <Trash2 className="size-5" />
          </span>
        }
        title="Delete this e-book permanently?"
        description={
          <>
            <b className="text-ink">{target?.title}</b> — This action cannot be undone. Readers who already bought it keep their copy.
          </>
        }
        confirmLabel="Delete E-book"
        onConfirm={async () => {
          if (!target) return
          try {
            await removeBook(target)
            toast({ title: 'E-book deleted', description: `“${target.title}” was removed.`, tone: 'error' })
          } catch (err) {
            fail(err, 'Couldn’t delete')
          }
        }}
      />
    </div>
  )
}
