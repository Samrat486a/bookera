import type { Ebook } from '../types'
import { getAuthor } from '../data/authors'

export const SORTS = ['Featured', 'Newest', 'Most Popular', 'Highest Rated'] as const
export const FORMATS = ['All', 'E-book', 'PDF', 'EPUB'] as const
export const PRICES = ['All', 'Free', 'Premium'] as const

export type Sort = (typeof SORTS)[number]

export interface EbookQuery {
  q: string
  category: string // 'All' or category name
  format: string
  price: string
  sort: Sort
  author?: string
}

export const sortSlug = (s: Sort) => s.toLowerCase().replace(/\s+/g, '-')
export const sortFromSlug = (slug: string | null): Sort => SORTS.find((s) => sortSlug(s) === slug) ?? 'Featured'

export function filterEbooks(books: Ebook[], query: EbookQuery) {
  const q = query.q.trim().toLowerCase()
  const out = books.filter((b) => {
    if (query.category !== 'All' && b.category !== query.category) return false
    if (query.format !== 'All' && b.format !== query.format) return false
    if (query.price === 'Free' && b.price !== 0) return false
    if (query.price === 'Premium' && b.price === 0) return false
    if (query.author && b.authorId !== query.author) return false
    if (q) {
      const author = getAuthor(b.authorId)?.name ?? ''
      const hay = [b.title, b.subtitle, author, b.category, b.description, ...b.tags].join(' ').toLowerCase()
      // every word must match somewhere
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false
    }
    return true
  })

  switch (query.sort) {
    case 'Newest':
      return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    case 'Most Popular':
      return out.sort((a, b) => b.readers - a.readers)
    case 'Highest Rated':
      return out.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    default:
      return out.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || Number(b.available) - Number(a.available) || b.readers - a.readers)
  }
}
