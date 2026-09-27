import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { categories } from '../../data/categories'
import { PRICES, SORTS } from '../../lib/filter'
import type { EbookQuery, Sort } from '../../lib/filter'
import { cx } from '../../lib/format'
import { Button } from '../ui/Button'
import { Select } from '../ui/Field'
import { Modal } from '../ui/Modal'

const shortName = (name: string) => (name === 'Artificial Intelligence' ? 'AI' : name)

interface Props {
  query: EbookQuery
  onChange: (patch: Partial<EbookQuery>) => void
  onClear: () => void
  activeCount: number
}

/** Search + category chips (scrollable) + secondary filters (inline on desktop, drawer on mobile). */
export function EbookFilters({ query, onChange, onClear, activeCount }: Props) {
  const [search, setSearch] = useState(query.q)
  const [drawer, setDrawer] = useState(false)

  // keep the input in sync if the URL changes elsewhere (e.g. Clear Filters)
  useEffect(() => setSearch(query.q), [query.q])

  // debounce typing → URL
  useEffect(() => {
    if (search === query.q) return
    const t = window.setTimeout(() => onChange({ q: search }), 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const secondary = (layout: 'inline' | 'stacked') => (
    <>
      <Select
        label={layout === 'stacked' ? 'Price' : undefined}
        aria-label="Price"
        value={query.price}
        onChange={(e) => onChange({ price: e.target.value })}
        options={PRICES.map((p) => ({ value: p, label: p === 'All' ? 'Any price' : p }))}
        className={layout === 'inline' ? 'h-14 w-[150px] rounded-full text-sm shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-14px_rgb(20_23_27/0.35)]' : ''}
      />
      <Select
        label={layout === 'stacked' ? 'Sort by' : undefined}
        aria-label="Sort by"
        value={query.sort}
        onChange={(e) => onChange({ sort: e.target.value as Sort })}
        options={SORTS.map((s) => ({ value: s, label: layout === 'inline' ? `Sort: ${s}` : s }))}
        className={layout === 'inline' ? 'h-14 w-[210px] rounded-full text-sm shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-14px_rgb(20_23_27/0.35)]' : ''}
      />
    </>
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            onChange({ q: search })
          }}
        >
          <label htmlFor="ebook-search" className="sr-only">
            Search e-books
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="ebook-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books, authors, categories..."
            className="h-14 w-full rounded-full border border-line-2 bg-white pr-12 pl-13 text-[15px] shadow-card transition duration-300 placeholder:text-muted/80 hover:border-ink/30 hover:shadow-[0_12px_28px_-16px_rgb(20_23_27/0.35)] focus:border-indigo focus:ring-4 focus:ring-indigo/12 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                onChange({ q: '' })
              }}
              className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </form>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">{secondary('inline')}</div>
        <button
          onClick={() => setDrawer(true)}
          className="relative flex h-14 shrink-0 items-center gap-2 rounded-full border border-line-2 bg-white px-5 text-sm font-semibold shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-ink/30 lg:hidden"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-indigo text-[11px] text-white">{activeCount}</span>}
        </button>
      </div>

      <div>
        {/* Category chips — horizontally scrollable */}
        <div className="relative min-w-0">
          <div role="radiogroup" aria-label="Category" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:[mask-image:linear-gradient(to_right,black_94%,transparent)] 2xl:[mask-image:none]">
            {['All', ...categories.map((c) => c.name)].map((c) => {
              const active = query.category === c
              return (
                <button
                  key={c}
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ category: c })}
                  className={cx(
                    'my-1 h-10 shrink-0 rounded-full px-4 text-sm font-medium whitespace-nowrap transition duration-300 ease-out hover:-translate-y-0.5',
                    active
                      ? 'bg-ink text-paper shadow-[0_8px_18px_-10px_rgb(20_23_27/0.7)]'
                      : 'border border-line bg-white/80 text-ink-2 hover:border-ink/25 hover:bg-white hover:text-ink hover:shadow-[0_10px_20px_-14px_rgb(20_23_27/0.4)]',
                  )}
                >
                  {c === 'All' ? 'All Categories' : shortName(c)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <Modal
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Filters"
        description="Narrow down the catalogue."
        fullscreenOnMobile
        footer={
          <>
            <Button variant="outline" onClick={onClear}>
              Clear Filters
            </Button>
            <Button onClick={() => setDrawer(false)}>Show results</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select
            label="Category"
            value={query.category}
            onChange={(e) => onChange({ category: e.target.value })}
            options={[{ value: 'All', label: 'All Categories' }, ...categories.map((c) => ({ value: c.name, label: c.name }))]}
          />
          {secondary('stacked')}
        </div>
      </Modal>
    </div>
  )
}
