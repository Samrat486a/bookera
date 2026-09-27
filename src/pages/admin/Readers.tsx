import { useState } from 'react'
import { Search, UserCheck, UserPlus, Users } from 'lucide-react'
import { readers } from '../../data/readers'
import { categories } from '../../data/categories'
import { formatDate } from '../../lib/format'
import type { Reader } from '../../types'
import { PageHeader } from '../../components/layout/Layouts'
import { StatCard } from '../../components/dashboard/DashboardCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { Avatar, EmptyState } from '../../components/ui/States'

const TODAY = new Date('2026-09-26T00:00:00')
const dateRanges = [
  { value: 'any', label: 'Any join date' },
  { value: '30', label: 'Last 30 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last 12 months' },
]
const toneFor = (s: Reader['status']) => (s === 'Active' ? 'leaf' : s === 'New' ? 'indigo' : 'neutral') as 'leaf' | 'indigo' | 'neutral'
const avatarTones = ['#3654FF', '#FFAE1F', '#FF5D5D', '#14171B', '#1F8A5B', '#0E7C7B']

export default function Readers() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')
  const [range, setRange] = useState('any')

  const list = readers.filter((r) => {
    const s = q.trim().toLowerCase()
    if (s && !`${r.name} ${r.email}`.toLowerCase().includes(s)) return false
    if (category !== 'All' && r.favoriteCategory !== category) return false
    if (status !== 'All' && r.status !== status) return false
    if (range !== 'any') {
      const days = (TODAY.getTime() - new Date(r.joinedAt + 'T00:00:00').getTime()) / 86400000
      if (days > Number(range)) return false
    }
    return true
  })
  const filtered = q || category !== 'All' || status !== 'All' || range !== 'any'
  const clear = () => {
    setQ('')
    setCategory('All')
    setStatus('All')
    setRange('any')
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Audience" title="Readers" description="People reading your books on Bookera. Demo data." />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total readers" value={readers.length} icon={Users} tone="ink" />
        <StatCard label="Active" value={readers.filter((r) => r.status === 'Active').length} icon={UserCheck} tone="leaf" />
        <StatCard label="New this month" value={readers.filter((r) => r.status === 'New').length} icon={UserPlus} tone="indigo" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="mt-8 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <label htmlFor="reader-search" className="sr-only">
            Search reader
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="reader-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reader..."
            className="h-11 w-full rounded-full border border-line-2 bg-white pr-4 pl-10 text-sm transition focus:border-indigo focus:ring-4 focus:ring-indigo/12 focus:outline-none"
          />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 xl:mx-0 xl:px-0">
          <Select aria-label="Favourite category" value={category} onChange={(e) => setCategory(e.target.value)} options={[{ value: 'All', label: 'All categories' }, ...categories.map((c) => c.name)]} className="h-11 w-48 rounded-full text-sm" />
          <Select aria-label="Reading status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'All', label: 'Any status' }, 'Active', 'New', 'Inactive']} className="h-11 w-36 rounded-full text-sm" />
          <Select aria-label="Join date" value={range} onChange={(e) => setRange(e.target.value)} options={dateRanges} className="h-11 w-44 rounded-full text-sm" />
          {filtered && (
            <Button variant="ghost" size="sm" onClick={clear} className="h-11">
              Clear
            </Button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState className="mt-6" variant="search" title="No readers found" description="Try changing your search or filters." action={<Button variant="dark" onClick={clear}>Clear Filters</Button>} />
      ) : (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-3xl border border-line bg-white shadow-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-line bg-paper/60 text-xs tracking-wide text-muted uppercase">
                  <tr>
                    {['Reader Name', 'Email', 'Books in Library', 'Books Completed', 'Join Date', 'Status'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap first:pl-6 last:pr-6">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((r, i) => (
                    <tr key={r.id} className="transition hover:bg-paper/50">
                      <td className="py-3 pr-4 pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name} tone={avatarTones[i % avatarTones.length]!} size="sm" />
                          <div>
                            <p className="font-semibold">{r.name}</p>
                            <p className="text-xs text-muted">Loves {r.favoriteCategory}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 text-ink-2">{r.email}</td>
                      <td className="px-4 font-semibold tabular-nums">{r.inLibrary}</td>
                      <td className="px-4 tabular-nums">
                        <span className="font-semibold">{r.completed}</span>
                        <span className="ml-2 text-xs text-muted">{r.inLibrary ? Math.round((r.completed / r.inLibrary) * 100) : 0}%</span>
                      </td>
                      <td className="px-4 whitespace-nowrap text-ink-2">{formatDate(r.joinedAt)}</td>
                      <td className="py-3 pr-6 pl-4">
                        <Badge tone={toneFor(r.status)} dot>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="mt-6 space-y-3 md:hidden">
            {list.map((r, i) => (
              <li key={r.id} className="rounded-3xl border border-line bg-white p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} tone={avatarTones[i % avatarTones.length]!} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-muted">{r.email}</p>
                  </div>
                  <Badge tone={toneFor(r.status)} dot>
                    {r.status}
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-xs">
                  <div>
                    <dt className="text-muted">Library</dt>
                    <dd className="mt-0.5 font-semibold">{r.inLibrary}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Completed</dt>
                    <dd className="mt-0.5 font-semibold">{r.completed}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Joined</dt>
                    <dd className="mt-0.5 font-semibold">{formatDate(r.joinedAt, { month: 'short', year: 'numeric' })}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
