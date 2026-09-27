/** Built-in categories (admins can add more, so any string is allowed). */
export type KnownCategory =
  | 'Programming'
  | 'Artificial Intelligence'
  | 'Technology'
  | 'Business'
  | 'Education'
  | 'Fiction'
  | 'Self Development'
  | 'Finance'
  | 'Design'
  | 'Science'
  | 'Entrepreneurship'
  | 'History'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type CategoryName = KnownCategory | (string & {})

export type BookFormat = 'E-book' | 'PDF' | 'EPUB'
export type BookStatus = 'published' | 'draft' | 'unpublished'
export type ReadingLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels'

export type CoverPattern =
  | 'grid'
  | 'rings'
  | 'stripes'
  | 'code'
  | 'wave'
  | 'blocks'
  | 'orbit'
  | 'arch'
  | 'dots'
  | 'sun'

export interface CoverDesign {
  bg: string
  fg: string
  accent: string
  pattern: CoverPattern
}

export interface Ebook {
  id: string
  title: string
  subtitle?: string
  category: CategoryName
  authorId: string
  description: string
  longDescription: string
  pages: number
  rating: number
  reviews: number
  publishedAt: string // ISO date
  format: BookFormat
  language: string
  price: number // 0 = free, in INR
  featured?: boolean
  readers: number
  level: ReadingLevel
  isbn: string
  tags: string[]
  learn: string[]
  requirements?: string[]
  cover: CoverDesign
  coverImage?: string
  status: BookStatus
  available: boolean
  // ── from the API (live catalogue) ──
  dbId?: number
  categorySlug?: string
  authorName?: string
  authorBio?: string | null
  publisher?: string | null
  /** Admin only: whether the private e-book file has been uploaded */
  hasFile?: boolean
  fileName?: string | null
  fileSize?: number | null
}

export interface Author {
  id: string
  name: string
  specialization: string
  bio: string
  books: number
  city: string
  followers: number
  tone: string // avatar background
}

export interface Category {
  name: CategoryName
  slug: string
  description: string
  tone: string
}

export type Role = 'reader' | 'admin'

export interface User {
  id?: number
  name: string
  email: string
  role: Role
  phone?: string | null
  bio?: string | null
  readingInterests?: string[]
  createdAt?: string | null
}

/** A purchased (or free) e-book in a member's library. */
export interface LibraryEntry {
  bookId: string
  addedAt: string // purchase date (ISO)
  progress: number // 0–100
  lastPage?: number
  orderId?: string
  amount?: number // INR paid, 0 for free titles
}

/** Details collected at checkout from buyers who aren't signed in. */
export interface CustomerDetails {
  name: string
  email: string
  phone: string
  password: string
}

export interface Reader {
  id: string
  name: string
  email: string
  inLibrary: number
  completed: number
  joinedAt: string
  status: 'Active' | 'Inactive' | 'New'
  favoriteCategory: CategoryName
}
