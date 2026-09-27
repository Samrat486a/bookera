import type { Author, Category, CoverDesign, CustomerDetails, Ebook, LibraryEntry, User } from '../types'

/**
 * Client for the PHP backend in /api.
 *
 *   VITE_API_MODE=mock  → the whole site runs in the browser with demo data (default)
 *   VITE_API_MODE=live  → the parts listed in LIVE below use the real PHP API
 *
 * The backend is being built in phases, so features switch to the server one
 * group at a time. Anything not yet live keeps working in demo mode.
 */
export const API_MODE: 'mock' | 'live' = import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock'
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

export const LIVE = {
  /** Phase 6: sign-up, login, logout, password reset, profile */
  auth: API_MODE === 'live',
  /** Phase 7: books, categories, authors, admin book management & uploads */
  catalog: API_MODE === 'live',
  /** Phases 8–10: cart, checkout, payments, library & downloads */
  commerce: false,
} as const

/**
 * Can visitors buy right now? In demo mode, yes (it's all simulated). On the live site,
 * only once real payments are connected — until then buy buttons show "Sales open soon",
 * so nobody goes through a pretend payment on the real website.
 */
export const SALES_OPEN: boolean = API_MODE === 'mock' || LIVE.commerce

export class ApiError extends Error {
  status: number
  code?: string
  /** Field-level messages from server validation, e.g. { email: 'Please enter a valid email address.' } */
  fields: Record<string, string>
  constructor(message: string, status: number, code?: string, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

/* ─────────── Transport ─────────── */

interface Envelope<T> {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string>
  code?: string
}

// CSRF token from GET /auth/session.php — sent on every POST.
let csrfToken: string | null = null
let csrfPromise: Promise<void> | null = null

async function ensureCsrf() {
  if (csrfToken) return
  csrfPromise ??= request<{ csrfToken: string }>('auth/session.php')
    .then(() => undefined)
    .finally(() => {
      csrfPromise = null
    })
  await csrfPromise
}

async function request<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}, retried = false): Promise<T> {
  const method = init.method ?? 'GET'
  if (method === 'POST') await ensureCsrf()

  let res: Response
  try {
    res = await fetch(`${API_BASE}/${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken ?? '' } : {}),
      },
      body: method === 'POST' ? JSON.stringify(init.body ?? {}) : undefined,
    })
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0, 'NETWORK')
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null
  const token = (json?.data as { csrfToken?: string } | undefined)?.csrfToken
  if (token) csrfToken = token

  if (!res.ok || !json?.success) {
    // Session expired or token rotated → fetch a fresh token and retry once.
    if (json?.code === 'CSRF_INVALID' && !retried) {
      csrfToken = null
      return request<T>(path, init, true)
    }
    throw new ApiError(json?.message ?? 'Something went wrong. Please try again.', res.status, json?.code, json?.errors ?? {})
  }
  return (json.data ?? {}) as T
}

/* ─────────── Accounts (live in Phase 6) ─────────── */

export interface ProfileUpdate {
  name: string
  phone?: string
  bio?: string
  readingInterests?: string[]
  email?: string
  currentPassword?: string
}

/* ─────────── Catalogue (live in Phase 7) ─────────── */

export interface BookQuery {
  q?: string
  category?: string
  author?: string
  price?: 'free' | 'paid'
  featured?: boolean
  sort?: 'featured' | 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'title'
  page?: number
  perPage?: number
}
export interface Pagination {
  page: number
  perPage: number
  total: number
  totalPages: number
}
export interface ApiCategory extends Category {
  bookCount: number
}

/** Fields sent by the admin book form (price in rupees). */
export interface BookInput {
  title: string
  subtitle?: string
  category: string
  author: string
  authorBio?: string
  description: string
  longDescription?: string
  pages: number
  format: 'PDF' | 'EPUB'
  language: string
  level: string
  publishedAt?: string
  price: number
  isbn?: string
  publisher?: string
  tags: string[]
  learn: string[]
  requirements?: string[]
  cover: CoverDesign
  status: 'draft' | 'published' | 'unpublished'
  available: boolean
  featured: boolean
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== false) p.set(k, String(v))
  })
  const str = p.toString()
  return str ? `?${str}` : ''
}

/** Multipart upload with progress (fetch can't report upload progress). */
function upload<T>(path: string, fields: Record<string, string>, fileField: string, file: File, onProgress?: (pct: number) => void): Promise<T> {
  return ensureCsrf().then(
    () =>
      new Promise<T>((resolve, reject) => {
        const form = new FormData()
        Object.entries(fields).forEach(([k, v]) => form.append(k, v))
        form.append(fileField, file)
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_BASE}/${path}`)
        xhr.withCredentials = true
        xhr.setRequestHeader('Accept', 'application/json')
        xhr.setRequestHeader('X-CSRF-Token', csrfToken ?? '')
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
        xhr.onerror = () => reject(new ApiError('Upload failed — check your connection and try again.', 0, 'NETWORK'))
        xhr.onload = () => {
          let json: Envelope<T> | null = null
          try {
            json = JSON.parse(xhr.responseText)
          } catch {
            /* non-JSON (e.g. server limit page) */
          }
          if (xhr.status >= 200 && xhr.status < 300 && json?.success) resolve((json.data ?? {}) as T)
          else if (xhr.status === 413) reject(new ApiError(json?.message ?? 'That file is too large for the server.', 413, 'FILE_TOO_LARGE', json?.errors ?? {}))
          else reject(new ApiError(json?.message ?? 'Upload failed. Please try again.', xhr.status, json?.code, json?.errors ?? {}))
        }
        xhr.send(form)
      }),
  )
}

type BookPayload = { book: Ebook }

/* ─────────── Commerce (legacy draft endpoints — replaced in Phases 8–10) ─────────── */

/** Order created on the server — amount is always taken from the database, never the browser. */
export interface CreatedOrder {
  orderId: string // our order reference, e.g. BKR-…
  free: boolean
  razorpayOrderId?: string
  keyId?: string
  amount: number // in paise
  currency: 'INR'
  bookTitle: string
  customer: { name: string; email: string }
  /** Present when the book was free and has already been granted. */
  purchase?: PurchaseResult
}

export interface PurchaseResult {
  orderId: string
  user: User
  entry: LibraryEntry
  emailSent: boolean
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type AuthPayload = { user: User; csrfToken?: string }

export const api = {
  // accounts
  session: () => request<{ user: User | null; csrfToken: string }>('auth/session.php'),
  login: (email: string, password: string) => request<AuthPayload>('auth/login.php', { method: 'POST', body: { email, password } }),
  register: (name: string, email: string, phone: string, password: string) =>
    request<AuthPayload>('auth/register.php', { method: 'POST', body: { name, email, phone, password } }),
  logout: () => request<null>('auth/logout.php', { method: 'POST' }),
  forgotPassword: (email: string) => request<null>('auth/forgot-password.php', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) => request<AuthPayload>('auth/reset-password.php', { method: 'POST', body: { token, password } }),
  profile: () => request<{ user: User }>('users/profile.php'),
  updateProfile: (update: ProfileUpdate) => request<{ user: User }>('users/update-profile.php', { method: 'POST', body: update }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<AuthPayload>('users/change-password.php', { method: 'POST', body: { currentPassword, newPassword } }),

  // catalogue
  books: (query: BookQuery = {}) =>
    request<{ books: Ebook[]; pagination: Pagination }>(
      'books/list.php' + qs({ q: query.q, category: query.category, author: query.author, price: query.price, featured: query.featured ? 1 : undefined, sort: query.sort, page: query.page, per_page: query.perPage }),
    ),
  bookDetails: (slug: string) => request<{ book: Ebook; author: Pick<Author, 'id' | 'name' | 'bio'>; related: Ebook[] }>('books/details.php' + qs({ slug })),
  categories: () => request<{ categories: ApiCategory[] }>('categories/list.php'),
  authors: () => request<{ authors: Author[] }>('authors/list.php'),

  // admin: books
  adminBooks: () => request<{ books: Ebook[] }>('admin/books/list.php'),
  createBook: (input: BookInput) => request<BookPayload>('admin/books/create.php', { method: 'POST', body: input }),
  updateBook: (dbId: number, input: BookInput) => request<BookPayload>('admin/books/update.php', { method: 'POST', body: { ...input, id: dbId } }),
  setBookStatus: (dbId: number, patch: { status?: Ebook['status']; available?: boolean; featured?: boolean }) =>
    request<BookPayload>('admin/books/status.php', { method: 'POST', body: { ...patch, id: dbId } }),
  deleteBook: (dbId: number) => request<null>('admin/books/delete.php', { method: 'POST', body: { id: dbId } }),
  uploadCover: (dbId: number, file: File, onProgress?: (pct: number) => void) => upload<BookPayload>('admin/books/upload-cover.php', { id: String(dbId) }, 'cover', file, onProgress),
  uploadBookFile: (dbId: number, file: File, onProgress?: (pct: number) => void) => upload<BookPayload>('admin/books/upload-file.php', { id: String(dbId) }, 'file', file, onProgress),

  // commerce (not live yet)
  library: () => request<{ entries: LibraryEntry[] }>('library/list.php'),
  saveProgress: (bookId: string, progress: number, lastPage: number) =>
    request<{ saved: true }>('library/progress.php', { method: 'POST', body: { bookId, progress, lastPage } }),
  pdfUrl: (bookId: string, download = false) => `${API_BASE}/library/pdf.php?book=${encodeURIComponent(bookId)}${download ? '&download=1' : ''}`,
  createOrder: (bookId: string, customer?: CustomerDetails) =>
    request<CreatedOrder>('checkout/create-order.php', { method: 'POST', body: { bookId, customer } }),
  verifyPayment: (orderId: string, payment: RazorpayPaymentResponse) =>
    request<PurchaseResult>('checkout/verify.php', { method: 'POST', body: { orderId, ...payment } }),
  markFailed: (orderId: string, reason: string) => request<{ done: true }>('checkout/failed.php', { method: 'POST', body: { orderId, reason } }),
}

/* ─────────── Razorpay Checkout ─────────── */

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', cb: (resp: { error?: { description?: string } }) => void) => void
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

let razorpayScript: Promise<void> | null = null
export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  razorpayScript ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      razorpayScript = null
      reject(new ApiError('Couldn’t load the payment gateway. Please check your connection.', 0, 'GATEWAY_LOAD'))
    }
    document.body.appendChild(s)
  })
  return razorpayScript
}

/** Opens Razorpay Checkout. Resolves with the signed payment, or rejects if cancelled/failed. */
export async function payWithRazorpay(order: CreatedOrder): Promise<RazorpayPaymentResponse> {
  await loadRazorpay()
  return new Promise((resolve, reject) => {
    // Razorpay keeps its window open after a failed attempt so the buyer can retry,
    // so we only settle when they succeed or close the window.
    let lastError: string | undefined
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Bookera',
      description: order.bookTitle,
      prefill: { name: order.customer.name, email: order.customer.email },
      notes: { order_ref: order.orderId },
      theme: { color: '#3654FF' },
      handler: (resp: RazorpayPaymentResponse) => resolve(resp),
      modal: {
        confirm_close: true,
        ondismiss: () =>
          reject(lastError ? new ApiError(lastError, 0, 'PAYMENT_FAILED') : new ApiError('Payment was cancelled.', 0, 'PAYMENT_CANCELLED')),
      },
    })
    rzp.on('payment.failed', (resp) => {
      lastError = resp.error?.description ?? 'Payment failed.'
    })
    rzp.open()
  })
}
