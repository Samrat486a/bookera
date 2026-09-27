import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookCheck, BookOpen, Eye, FilePen, Plus, Users } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { readerGrowth, readsOverTime } from '../../data/readers'
import { formatNumber } from '../../lib/format'
import { PageHeader } from '../../components/layout/Layouts'
import { Panel, StatCard } from '../../components/dashboard/DashboardCard'
import { AreaChart, BarList, ColumnChart } from '../../components/dashboard/Charts'
import { BookCover } from '../../components/ebooks/BookCover'
import { ButtonLink } from '../../components/ui/Button'
import { Rating } from '../../components/ui/States'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Overview() {
  const { user, books } = useStore()
  const published = books.filter((b) => b.status === 'published')
  const drafts = books.filter((b) => b.status === 'draft')
  const totalReaders = published.reduce((s, b) => s + b.readers, 0)
  const totalReads = readsOverTime.reduce((s, d) => s + d.value, 0)

  const byCategory = useMemo(() => {
    const m = new Map<string, number>()
    books.forEach((b) => m.set(b.category, (m.get(b.category) ?? 0) + 1))
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [books])

  const top = [...published].sort((a, b) => b.readers - a.readers).slice(0, 5)
  const growth = Math.round(((readsOverTime.at(-1)!.value - readsOverTime.at(-2)!.value) / readsOverTime.at(-2)!.value) * 100)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Admin Studio"
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? 'there'}`}
        description="Here’s how your catalogue is performing. All figures are demo data."
        actions={
          <ButtonLink to="/admin/books/new">
            <Plus className="size-4" aria-hidden /> Add E-book
          </ButtonLink>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total E-books" value={books.length} icon={BookOpen} tone="ink" hint="In your catalogue" />
        <StatCard label="Published" value={published.length} icon={BookCheck} tone="leaf" hint="Live for readers" />
        <StatCard label="Total Readers" value={totalReaders} icon={Users} tone="indigo" format={formatNumber} hint="Across all titles" />
        <StatCard label="Total Reads" value={totalReads} icon={Eye} tone="saffron" format={formatNumber} hint={<span className="font-medium text-leaf">▲ {growth}% this month</span>} />
        <StatCard label="Draft Books" value={drafts.length} icon={FilePen} tone="coral" hint="Waiting to publish" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Reads over time" description="Monthly reads, last 12 months" className="xl:col-span-2">
          <AreaChart data={readsOverTime} caption="Monthly reads over the last 12 months" />
        </Panel>
        <Panel title="Books by category" description="Titles in your catalogue">
          <BarList data={byCategory} caption="Number of e-books per category" />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Reader growth" description="New readers per month">
          <ColumnChart data={readerGrowth} caption="New readers per month, April to September" />
        </Panel>
        <Panel
          title="Top performing e-books"
          description="By total readers"
          className="xl:col-span-2"
          action={
            <Link to="/admin/books" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo hover:underline">
              Manage <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        >
          <ol className="-mx-2 divide-y divide-line">
            {top.map((b, i) => (
              <li key={b.id} className="flex items-center gap-4 rounded-xl px-2 py-3">
                <span className="w-5 font-display text-sm font-bold text-muted">{i + 1}</span>
                <BookCover title={b.title} cover={b.cover} image={b.coverImage} size="sm" className="w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link to={`/ebooks/${b.id}`} className="block truncate font-semibold hover:text-indigo">
                    {b.title}
                  </Link>
                  <p className="truncate text-xs text-muted">{b.category}</p>
                </div>
                <Rating value={b.rating} className="hidden sm:inline-flex" />
                <span className="w-16 text-right font-display font-bold tabular-nums">{formatNumber(b.readers)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  )
}
