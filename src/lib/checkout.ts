import type { CustomerDetails, Ebook, User } from '../types'
import type { CreatedOrder, PurchaseResult } from './api'
import { todayISO } from './format'

/** Demo-mode helpers that mirror what the PHP backend does in live mode. */

const ref = () => {
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `BKR-${ymd}-${rand}`
}

export function createMockOrder(book: Ebook, buyer: { name: string; email: string }): CreatedOrder {
  return {
    orderId: ref(),
    free: book.price === 0,
    amount: book.price * 100,
    currency: 'INR',
    bookTitle: book.title,
    customer: { name: buyer.name, email: buyer.email },
  }
}

export function fulfilMockOrder(order: CreatedOrder, book: Ebook, buyer: User | CustomerDetails): PurchaseResult {
  return {
    orderId: order.orderId,
    user: { name: buyer.name, email: buyer.email.toLowerCase(), role: 'reader' },
    entry: { bookId: book.id, addedAt: todayISO(), progress: 0, orderId: order.orderId, amount: book.price },
    emailSent: false,
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Same rule as the server: digits, spaces, + ( ) . - allowed; 10–15 digits. */
export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return /^[\d\s()+.-]+$/.test(value.trim()) && digits.length >= 10 && digits.length <= 15
}

/** Server field errors (ApiError.fields) mapped onto a form's own field ids. */
export function fieldErrors(err: unknown, rename: Record<string, string> = {}): Record<string, string> | null {
  const fields = (err as { fields?: Record<string, string> } | null)?.fields
  if (!fields || !Object.keys(fields).length) return null
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [rename[k] ?? k, v]))
}
