import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { getAuthor } from '../data/authors'
import { filterEbooks, sortFromSlug, sortSlug } from '../lib/filter'
import type { EbookQuery } from '../lib/filter'
import { useSimulatedLoading } from '../lib/hooks'
import { LIVE, api } from '../lib/api'
import type { BookQuery } from '../lib/api'
import type { Ebook } from '../types'
import { EbookFilters } from '../components/ebooks/EbookFilters'
import { EbookCard } from '../components/ebooks/EbookCard'
import { EbookGrid } from '../components/ebooks/EbookGrid'
import { BookCardSkeleton, EmptyState, ErrorState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { InteractiveGrid } from '../components/ui/InteractiveGrid'

const PER_PAGE = 24
const SORTS: Record<EbookQuery['sort'], BookQuery['sort']> = { Featured: 'featured', Newest: 'newest', 'Most Popular': 'popular', 'Highest Rated': 'rating' }

/** Live catalogue: search, filters, sorting and paging happen on the server (MySQL). */
function useServerBooks(query: EbookQuery, key: string, enabled: boolean) {
  const [state, setState] = useState<{ books: Ebook[]; total: number; page: number; totalPages: number; loading: boolean; more: boolean; error: string | null }>({
    books: [], total: 0, page: 1, totalPages: 1, loading: enabled, more: false, error: null,
  })

  const fetchPage = useCallback(
    async (page: number) => {
      const res = await api.books({
        q: query.q || undefined,
        category: query.category !== 'All' ? query.category : undefined,
        author: query.author,
        price: query.price === 'Free' ? 'free' : query.price === 'Premium' ? 'paid' : undefined,
        sort: SORTS[query.sort],
        page,
        perPage: PER_PAGE,
      })
      return res
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  const load = useCallback(() => {
    if (!enabled) return () => {}
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchPage(1)
      .then(({ books, pagination }) => !cancelled && setState({ books, total: pagination.total, page: 1, totalPages: pagination.totalPages, loading: false, more: false, error: null }))
      .catch((err) => !cancelled && setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Please try again.' })))
    return () => {
      cancelled = true
    }
  }, [enabled, fetchPage])

  useEffect(() => load(), [load])

  const loadMore = async () => {
    setState((s) => ({ ...s, more: true }))
    try {
      const { books, pagination } = await fetchPage(state.page + 1)
      setState((s) => ({ ...s, books: [...s.books, ...books], page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, more: false }))
    } catch {
      setState((s) => ({ ...s, more: false }))
    }
  }

  return { ...state, reload: load, loadMore }
}

export default function Ebooks() {
  const { publicBooks } = useStore()
  const [params, setParams] = useSearchParams()

  const query: EbookQuery = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? 'All',
    format: 'All', // format filter removed from the UI
    price: params.get('price') ?? 'All',
    sort: sortFromSlug(params.get('sort')),
    author: params.get('author') ?? undefined,
  }
  const demoError = params.get('demo') === 'error'

  const localResults = useMemo(() => filterEbooks(publicBooks, query), [publicBooks, params.toString()]) // eslint-disable-line react-hooks/exhaustive-deps
  const simulatedLoading = useSimulatedLoading([params.toString()], 380)
  const server = useServerBooks(query, params.toString(), LIVE.catalog)
  const results = LIVE.catalog ? server.books : localResults
  const loading = LIVE.catalog ? server.loading : simulatedLoading
  const total = LIVE.catalog ? server.total : localResults.length

  const update = (patch: Partial<EbookQuery>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      const val = k === 'sort' ? sortSlug(v as EbookQuery['sort']) : String(v ?? '')
      const isDefault = !val || val === 'All' || (k === 'sort' && val === 'featured')
      if (isDefault) next.delete(k)
      else next.set(k, val)
    })
    setParams(next, { replace: true })
  }
  const clear = () => setParams(new URLSearchParams(), { replace: true })

  const active: Array<{ key: keyof EbookQuery; label: string }> = []
  if (query.q) active.push({ key: 'q', label: `“${query.q}”` })
  if (query.category !== 'All') active.push({ key: 'category', label: query.category })
  if (query.price !== 'All') active.push({ key: 'price', label: query.price })
  if (query.author) active.push({ key: 'author', label: `By ${getAuthor(query.author)?.name ?? query.author}` })

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <InteractiveGrid className="[mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-page relative pt-14 pb-10 sm:pt-20">
          <p className="eyebrow">
            <span className="h-px w-6 bg-ink/30" aria-hidden />
            The catalogue
          </p>
          <h1 className="mt-3 max-w-3xl text-[2.5rem] leading-[1] font-bold tracking-[-0.035em] sm:text-6xl">Find your next great read.</h1>
          <p className="mt-4 max-w-xl text-[17px] text-muted">Explore e-books across technology, education, business, fiction, and more.</p>
          <div className="mt-10">
            <EbookFilters query={query} onChange={update} onClear={clear} activeCount={active.length + (query.sort !== 'Featured' ? 1 : 0)} />
          </div>
        </div>
      </section>

      <section className="container-page py-10 sm:py-14" aria-live="polite" aria-busy={loading}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 text-[15px]">
              <span className="font-display text-xl font-bold">{loading ? '—' : total}</span>{' '}
              <span className="text-muted">{total === 1 ? 'e-book' : 'e-books'} found</span>
            </p>
            {active.map((a) => (
              <button
                key={a.key}
                onClick={() => update({ [a.key]: '' })}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[13px] font-medium text-indigo-600 transition duration-300 hover:-translate-y-0.5 hover:bg-indigo hover:text-white hover:shadow-[0_8px_18px_-10px_rgb(54_84_255/0.8)]"
                aria-label={`Remove filter ${a.label}`}
              >
                {a.label} <X className="size-3.5" aria-hidden />
              </button>
            ))}
          </div>
          {(active.length > 0 || query.sort !== 'Featured') && (
            <Button variant="ghost" size="sm" onClick={clear} className="self-start sm:self-auto">
              Clear Filters
            </Button>
          )}
        </div>

        {demoError ? (
          <ErrorState onRetry={() => update({ demo: '' } as Partial<EbookQuery>)} />
        ) : LIVE.catalog && server.error ? (
          <ErrorState onRetry={() => server.reload()} />
        ) : loading ? (
          <EbookGrid>
            {Array.from({ length: 6 }, (_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </EbookGrid>
        ) : results.length === 0 ? (
          <EmptyState
            variant="search"
            title="No e-books found"
            description="Try changing your search or filters."
            action={
              <Button variant="dark" onClick={clear}>
                Clear Filters
              </Button>
            }
          />
        ) : (
          <>
            <EbookGrid>
              {results.map((b, i) => (
                <EbookCard key={b.id} book={b} className="animate-fade-up" style={{ animationDelay: `${Math.min(i % PER_PAGE, 8) * 45}ms` }} />
              ))}
            </EbookGrid>
            {LIVE.catalog && server.page < server.totalPages && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" size="lg" onClick={server.loadMore} disabled={server.more}>
                  {server.more ? 'Loading…' : `Load more (${server.total - results.length} left)`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
