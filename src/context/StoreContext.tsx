import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Ebook, LibraryEntry, User } from '../types'
import { initialEbooks } from '../data/ebooks'
import { DEMO_MEMBER_EMAIL, seedLibrary } from '../data/readers'
import { ApiError, LIVE, api } from '../lib/api'
import type { BookInput, ProfileUpdate } from '../lib/api'
import { authors as authorRegistry, replaceAuthors } from '../data/authors'
import { replaceCategories } from '../data/categories'
import { slugify } from '../lib/format'

/**
 * App store.
 *  • Accounts: from the PHP API when LIVE.auth is on (session cookie), otherwise
 *    a browser-only demo.
 *  • Catalogue, libraries, purchases: browser demo data until LIVE.commerce is on
 *    (Phases 7–10); libraries are kept per member email.
 */

const KEYS = { user: 'bookera:user', libraries: 'bookera:libraries', books: 'bookera:books', accounts: 'bookera:accounts' } as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

/** Demo-only account list (no passwords are stored in mock mode). */
type Accounts = Record<string, { name: string; role: User['role'] }>
const seedAccounts: Accounts = {
  [DEMO_MEMBER_EMAIL]: { name: 'Maya Patel', role: 'reader' },
  'admin@bookera.demo': { name: 'Bookera Admin', role: 'admin' },
}
const seedLibraries: Record<string, LibraryEntry[]> = { [DEMO_MEMBER_EMAIL]: seedLibrary }

const nameFromEmail = (email: string) =>
  email
    .split('@')[0]!
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(' ') || 'Reader'

interface StoreValue {
  user: User | null
  /** False until the live-mode session check has finished. */
  authReady: boolean
  login: (user: User) => void
  signIn: (email: string, password: string) => Promise<User>
  signUp: (name: string, email: string, password: string, phone: string) => Promise<User>
  signOut: () => Promise<void>
  updateProfile: (update: ProfileUpdate) => Promise<User>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<User>
  /** Mock mode: whether an account already exists for this email. */
  accountExists: (email: string) => boolean

  books: Ebook[]
  publicBooks: Ebook[]
  getBook: (id: string) => Ebook | undefined
  /** False until the live catalogue has loaded (always true in demo mode). */
  catalogReady: boolean
  catalogError: string | null
  refreshCatalog: () => Promise<void>
  // admin book management — API in live mode, in-browser in demo mode
  createBook: (input: BookInput) => Promise<Ebook>
  editBook: (book: Ebook, input: BookInput) => Promise<Ebook>
  setBookStatus: (book: Ebook, patch: { status?: Ebook['status']; available?: boolean; featured?: boolean }) => Promise<Ebook>
  removeBook: (book: Ebook) => Promise<void>
  uploadCover: (book: Ebook, file: File, onProgress?: (pct: number) => void) => Promise<Ebook>
  uploadBookFile: (book: Ebook, file: File, onProgress?: (pct: number) => void) => Promise<Ebook>

  library: LibraryEntry[]
  isInLibrary: (bookId: string) => boolean
  getEntry: (bookId: string) => LibraryEntry | undefined
  /** Signs the buyer in (if needed) and adds the purchased book to their library. */
  completePurchase: (user: User, entry: LibraryEntry) => void
  setProgress: (bookId: string, progress: number, lastPage?: number) => void
  refreshLibrary: () => Promise<void>

  resetDemo: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const live = LIVE.auth
  const liveCommerce = LIVE.commerce
  const [user, setUser] = useState<User | null>(() => (live ? null : load<User | null>(KEYS.user, null)))
  const [authReady, setAuthReady] = useState(!live)
  const liveCatalog = LIVE.catalog
  const [books, setBooks] = useState<Ebook[]>(() => (liveCatalog ? [] : load<Ebook[]>(KEYS.books, initialEbooks)))
  const [catalogReady, setCatalogReady] = useState(!liveCatalog)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [libraries, setLibraries] = useState<Record<string, LibraryEntry[]>>(() => (liveCommerce ? {} : load(KEYS.libraries, seedLibraries)))
  const [accounts, setAccounts] = useState<Accounts>(() => load(KEYS.accounts, seedAccounts))

  useEffect(() => {
    if (!live) save(KEYS.user, user)
  }, [user, live])
  useEffect(() => {
    if (!liveCatalog) save(KEYS.books, books)
  }, [books, liveCatalog])
  useEffect(() => {
    if (!liveCommerce) save(KEYS.libraries, libraries)
  }, [libraries, liveCommerce])
  useEffect(() => save(KEYS.accounts, accounts), [accounts])

  const email = user?.email.toLowerCase() ?? ''
  const library = useMemo(() => (email ? (libraries[email] ?? []) : []), [libraries, email])

  const refreshLibrary = useCallback(async () => {
    if (!liveCommerce || !email) return
    const { entries } = await api.library()
    setLibraries((l) => ({ ...l, [email]: entries }))
  }, [liveCommerce, email])

  // Live mode: restore the PHP session on load.
  useEffect(() => {
    if (!live) return
    api
      .session()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true))
  }, [live])
  useEffect(() => {
    refreshLibrary().catch(() => {})
  }, [refreshLibrary])

  const getBook = useCallback((id: string) => books.find((b) => b.id === id), [books])

  /* ── Live catalogue: books, categories and authors from MySQL ── */
  const isAdmin = user?.role === 'admin'
  const refreshCatalog = useCallback(async () => {
    if (!liveCatalog) return
    try {
      const [{ categories }, { authors }] = await Promise.all([api.categories(), api.authors()])
      replaceCategories(categories.map(({ bookCount: _n, ...c }) => c))
      replaceAuthors(authors)
      let list: Ebook[]
      if (isAdmin) {
        list = (await api.adminBooks()).books // admins also see drafts & unpublished
      } else {
        list = []
        for (let page = 1; ; page++) {
          const { books: chunk, pagination } = await api.books({ perPage: 100, page })
          list.push(...chunk)
          if (page >= pagination.totalPages) break
        }
      }
      setBooks(list)
      setCatalogError(null)
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : 'Couldn’t load the catalogue.')
    } finally {
      setCatalogReady(true)
    }
  }, [liveCatalog, isAdmin])

  useEffect(() => {
    if (liveCatalog && authReady) refreshCatalog()
  }, [liveCatalog, authReady, refreshCatalog])

  const upsert = useCallback((book: Ebook) => {
    // A brand-new author typed in the admin form: make their name available everywhere at once.
    if (book.authorName && !authorRegistry.some((a) => a.id === book.authorId)) {
      authorRegistry.push({ id: book.authorId, name: book.authorName, bio: book.authorBio ?? '', specialization: '', city: '', books: 1, followers: 0, tone: '#14171B' })
    }
    setBooks((bs) => (bs.some((b) => b.id === book.id) ? bs.map((b) => (b.id === book.id ? book : b)) : [book, ...bs]))
    return book
  }, [])

  /** Demo mode: turn the form input into a local book. */
  const localBook = useCallback(
    (input: BookInput, existing?: Ebook): Ebook => {
      const author = input.author.trim()
      const authorId = existing?.authorId && existing.authorName === author ? existing.authorId : slugify(author)
      let id = existing?.id ?? slugify(input.title)
      if (!existing && books.some((b) => b.id === id)) id = `${id}-${Date.now().toString(36)}`
      return {
        ...(existing ?? { rating: 0, reviews: 0, readers: 0, hasFile: false }),
        id,
        title: input.title,
        subtitle: input.subtitle || undefined,
        category: input.category,
        authorId,
        authorName: author,
        authorBio: input.authorBio,
        description: input.description,
        longDescription: input.longDescription || input.description,
        pages: input.pages,
        publishedAt: input.publishedAt || new Date().toISOString().slice(0, 10),
        format: input.format,
        language: input.language,
        price: input.price,
        level: input.level as Ebook['level'],
        isbn: input.isbn ?? '',
        tags: input.tags,
        learn: input.learn,
        requirements: input.requirements,
        cover: input.cover,
        status: input.status,
        available: input.available,
        featured: input.featured,
      } as Ebook
    },
    [books],
  )

  const createBook = useCallback(
    async (input: BookInput) => (liveCatalog ? upsert((await api.createBook(input)).book) : upsert(localBook({ ...input, status: 'draft' }))),
    [liveCatalog, upsert, localBook],
  )
  const editBook = useCallback(
    async (book: Ebook, input: BookInput) => (liveCatalog ? upsert((await api.updateBook(book.dbId!, input)).book) : upsert(localBook(input, book))),
    [liveCatalog, upsert, localBook],
  )
  const setBookStatus = useCallback(
    async (book: Ebook, patch: { status?: Ebook['status']; available?: boolean; featured?: boolean }) => {
      if (liveCatalog) return upsert((await api.setBookStatus(book.dbId!, patch)).book)
      if (patch.status === 'published' && book.hasFile === false) {
        throw new ApiError('Upload the e-book file (PDF or EPUB) before publishing.', 422, 'FILE_REQUIRED', { file: 'An e-book file is required to publish.' })
      }
      return upsert({ ...book, ...patch })
    },
    [liveCatalog, upsert],
  )
  const removeBook = useCallback(
    async (book: Ebook) => {
      if (liveCatalog) await api.deleteBook(book.dbId!)
      setBooks((bs) => bs.filter((b) => b.id !== book.id))
    },
    [liveCatalog],
  )
  const uploadCover = useCallback(
    async (book: Ebook, file: File, onProgress?: (pct: number) => void) => {
      if (liveCatalog) return upsert((await api.uploadCover(book.dbId!, file, onProgress)).book)
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(String(r.result))
        r.onerror = () => rej(new ApiError('Couldn’t read that image.', 0))
        r.readAsDataURL(file)
      })
      onProgress?.(100)
      return upsert({ ...book, coverImage: dataUrl })
    },
    [liveCatalog, upsert],
  )
  const uploadBookFile = useCallback(
    async (book: Ebook, file: File, onProgress?: (pct: number) => void) => {
      if (liveCatalog) return upsert((await api.uploadBookFile(book.dbId!, file, onProgress)).book)
      onProgress?.(100)
      return upsert({ ...book, hasFile: true, fileName: file.name, fileSize: file.size, format: file.name.toLowerCase().endsWith('.epub') ? 'EPUB' : 'PDF' })
    },
    [liveCatalog, upsert],
  )

  const signIn = useCallback(
    async (mail: string, password: string) => {
      if (live) {
        const { user } = await api.login(mail, password)
        setUser(user)
        return user
      }
      const key = mail.toLowerCase()
      const acct = accounts[key]
      const u: User = { name: acct?.name ?? nameFromEmail(key), email: key, role: acct?.role === 'admin' ? 'admin' : 'reader' }
      if (!acct) setAccounts((a) => ({ ...a, [key]: { name: u.name, role: u.role } }))
      setUser(u)
      return u
    },
    [live, accounts],
  )

  const signUp = useCallback(
    async (name: string, mail: string, password: string, phone: string) => {
      if (live) {
        const { user } = await api.register(name, mail, phone, password)
        setUser(user)
        return user
      }
      const key = mail.toLowerCase()
      if (accounts[key]) throw new ApiError('An account with this email already exists. Please log in instead.', 409, 'ACCOUNT_EXISTS')
      const u: User = { name, email: key, role: 'reader', phone }
      setAccounts((a) => ({ ...a, [key]: { name, role: 'reader' } }))
      setUser(u)
      return u
    },
    [live, accounts],
  )

  const signOut = useCallback(async () => {
    if (live) await api.logout().catch(() => {})
    setUser(null)
  }, [live])

  const updateProfile = useCallback(
    async (update: ProfileUpdate) => {
      if (live) {
        const { user } = await api.updateProfile(update)
        setUser(user)
        return user
      }
      const next = { ...user!, name: update.name, phone: update.phone ?? null, bio: update.bio ?? null, readingInterests: update.readingInterests ?? [], email: update.email || user!.email }
      setUser(next)
      return next
    },
    [live, user],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (live) {
        await api.changePassword(currentPassword, newPassword)
        return
      }
      if (newPassword.length < 8) throw new ApiError('Please check the highlighted fields.', 422, 'VALIDATION_FAILED', { newPassword: 'Use at least 8 characters.' })
    },
    [live],
  )

  const requestPasswordReset = useCallback(
    async (mail: string) => {
      if (live) await api.forgotPassword(mail)
    },
    [live],
  )

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      if (!live) throw new ApiError('Password reset needs the live backend (VITE_API_MODE=live).', 400, 'NOT_AVAILABLE')
      const { user } = await api.resetPassword(token, password)
      setUser(user)
      return user
    },
    [live],
  )

  const completePurchase = useCallback((buyer: User, entry: LibraryEntry) => {
    const key = buyer.email.toLowerCase()
    setAccounts((a) => (a[key] ? a : { ...a, [key]: { name: buyer.name, role: buyer.role } }))
    setLibraries((l) => {
      const list = l[key] ?? []
      return list.some((e) => e.bookId === entry.bookId) ? l : { ...l, [key]: [entry, ...list] }
    })
    setUser({ ...buyer, email: key })
  }, [])

  const setProgress = useCallback(
    (bookId: string, progress: number, lastPage?: number) => {
      if (!email) return
      const p = Math.max(0, Math.min(100, Math.round(progress)))
      setLibraries((l) => ({
        ...l,
        [email]: (l[email] ?? []).map((e) => (e.bookId === bookId ? { ...e, progress: Math.max(e.progress, p), lastPage: lastPage ?? e.lastPage } : e)),
      }))
    },
    [email],
  )

  const value = useMemo<StoreValue>(
    () => ({
      user,
      authReady,
      login: setUser,
      signIn,
      signUp,
      signOut,
      updateProfile,
      changePassword,
      requestPasswordReset,
      resetPassword,
      // Live accounts: the server decides at sign-up/checkout (no email look-ups from the browser).
      accountExists: (mail) => !live && !!accounts[mail.toLowerCase()],

      books,
      publicBooks: books.filter((b) => b.status === 'published'),
      getBook,
      catalogReady,
      catalogError,
      refreshCatalog,
      createBook,
      editBook,
      setBookStatus,
      removeBook,
      uploadCover,
      uploadBookFile,

      library,
      isInLibrary: (bookId) => library.some((e) => e.bookId === bookId),
      getEntry: (bookId) => library.find((e) => e.bookId === bookId),
      completePurchase,
      setProgress,
      refreshLibrary,

      resetDemo: () => {
        setBooks(initialEbooks)
        setLibraries(seedLibraries)
        setAccounts(seedAccounts)
      },
    }),
    [user, authReady, signIn, signUp, signOut, updateProfile, changePassword, requestPasswordReset, resetPassword, live, accounts, books, getBook, catalogReady, catalogError, refreshCatalog, createBook, editBook, setBookStatus, removeBook, uploadCover, uploadBookFile, library, completePurchase, setProgress, refreshLibrary],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
