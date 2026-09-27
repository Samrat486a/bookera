import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  Download,
  FileText,
  Library,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { getAuthor } from '../data/authors'
import { ApiError, LIVE, SALES_OPEN, api, payWithRazorpay } from '../lib/api'
import type { CreatedOrder, PurchaseResult } from '../lib/api'
import { EMAIL_RE, createMockOrder, fulfilMockOrder, isValidPhone } from '../lib/checkout'
import { downloadBookPdf } from '../lib/pdf/bookPdf'
import { cx, formatDate, formatPrice } from '../lib/format'
import type { CustomerDetails, Ebook } from '../types'
import { BookCover } from '../components/ebooks/BookCover'
import { MockGateway } from '../components/checkout/MockGateway'
import { InteractiveGrid } from '../components/ui/InteractiveGrid'
import { Button, ButtonLink } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { EmptyState } from '../components/ui/States'
import { Avatar } from '../components/ui/States'

/* ─────────────────────────── Shared bits ─────────────────────────── */

function Steps({ step }: { step: 1 | 2 | 3 }) {
  const items = ['Your details', 'Payment', 'Start reading']
  return (
    <ol className="flex items-center gap-2 text-sm sm:gap-3" aria-label="Checkout progress">
      {items.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const done = n < step
        const active = n === step
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <span
              className={cx(
                'grid size-7 place-items-center rounded-full text-xs font-bold transition',
                done ? 'bg-leaf text-white' : active ? 'bg-ink text-paper' : 'border border-line-2 bg-white text-muted',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : n}
            </span>
            <span className={cx('hidden font-medium sm:inline', active ? 'text-ink' : 'text-muted')}>{label}</span>
            {i < items.length - 1 && <span className="h-px w-5 bg-line-2 sm:w-10" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

function OrderSummary({ book }: { book: Ebook }) {
  const author = getAuthor(book.authorId)
  const perks = [
    { icon: Zap, text: 'Instant access in your member library' },
    { icon: Mail, text: 'PDF copy emailed to you after purchase' },
    { icon: BookOpen, text: 'Read online — no download needed' },
    { icon: Download, text: 'Download the PDF anytime' },
  ]
  return (
    <aside className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6 lg:sticky lg:top-24">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Order summary</p>
      <div className="mt-4 flex gap-4">
        <BookCover title={book.title} author={author?.name} category={book.category} cover={book.cover} image={book.coverImage} size="sm" className="w-20 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-indigo uppercase">{book.category}</p>
          <p className="mt-1 font-display text-lg leading-snug font-bold">{book.title}</p>
          <p className="text-sm text-muted">By {author?.name}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
            <FileText className="size-3.5" aria-hidden /> PDF e-book · {book.pages} pages
          </p>
        </div>
      </div>
      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Price</dt>
          <dd>{formatPrice(book.price)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Taxes</dt>
          <dd>Included</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-semibold">Total</dt>
          <dd className="font-display text-2xl font-bold">{formatPrice(book.price)}</dd>
        </div>
      </dl>
      <ul className="mt-5 space-y-2.5">
        {perks.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-sm text-ink-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-paper-2 text-indigo">
              <Icon className="size-3.5" aria-hidden />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-center gap-2 rounded-xl bg-paper p-3 text-xs text-muted">
        <ShieldCheck className="size-4 shrink-0 text-leaf" aria-hidden />
        Secure payments by Razorpay — UPI, cards, netbanking & wallets.
      </p>
    </aside>
  )
}

/* ─────────────────────────── Checkout ─────────────────────────── */

type Gateway = { order: CreatedOrder; resolve: () => void; reject: (e: ApiError) => void }

export default function Checkout() {
  const { bookId = '' } = useParams()
  const { getBook, user, signOut, signUp, accountExists, completePurchase, isInLibrary, catalogReady } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const book = getBook(bookId)

  const [form, setForm] = useState<CustomerDetails & { confirm: string; terms: boolean }>({ name: '', email: '', phone: '', password: '', confirm: '', terms: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<null | 'order' | 'verify'>(null)
  const [failure, setFailure] = useState<{ message: string; code?: string } | null>(null)
  const [gateway, setGateway] = useState<Gateway | null>(null)
  const submitting = useRef(false)

  if (!book && !catalogReady) {
    return (
      <div className="grid min-h-[50vh] place-items-center" role="status" aria-label="Loading">
        <Loader2 className="size-6 animate-spin text-muted" aria-hidden />
      </div>
    )
  }
  if (!book || book.status !== 'published') {
    return (
      <div className="container-page py-20">
        <EmptyState variant="search" title="This e-book isn’t available" description="It may have been unpublished or the link is incorrect." action={<ButtonLink to="/ebooks">Browse E-books</ButtonLink>} />
      </div>
    )
  }
  if (!SALES_OPEN) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="Sales open soon"
          description="We’re putting the finishing touches on secure checkout. You can browse the whole catalogue in the meantime."
          action={
            <>
              <ButtonLink to={`/ebooks/${book.id}`}>Back to the e-book</ButtonLink>
              <ButtonLink to="/ebooks" variant="outline">
                Browse E-books
              </ButtonLink>
            </>
          }
        />
      </div>
    )
  }
  if (user && isInLibrary(book.id)) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="You already own this e-book"
          description="It’s waiting in your library — open it anytime."
          action={
            <>
              <ButtonLink to={`/read/${book.id}`}>
                <BookOpen className="size-4" aria-hidden /> Read now
              </ButtonLink>
              <ButtonLink to="/dashboard" variant="outline">
                My Library
              </ButtonLink>
            </>
          }
        />
      </div>
    )
  }

  const free = book.price === 0
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors(({ [k]: _drop, ...rest }) => rest)
  }

  const validate = () => {
    if (user) return true
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = 'Please enter your full name.'
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address — your e-book is sent here.'
    if (!isValidPhone(form.phone)) e.phone = 'Please enter a valid phone number (10–15 digits).'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    if (!form.confirm || form.confirm !== form.password) e.confirm = 'Passwords don’t match.'
    if (!form.terms) e.terms = 'Please accept the terms to continue.'
    setErrors(e)
    const first = Object.keys(e)[0]
    if (first) document.getElementById(`co-${first}`)?.focus()
    return !first
  }

  /** Demo mode: show the stand-in gateway and wait for the buyer's choice. */
  const runMockGateway = (order: CreatedOrder) =>
    new Promise<void>((resolve, reject) => setGateway({ order, resolve, reject }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting.current || !validate()) return
    submitting.current = true
    setFailure(null)
    const customer: CustomerDetails | undefined = user ? undefined : { name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), password: form.password }
    const buyer = user ?? customer!

    try {
      let result: PurchaseResult
      setBusy('order')
      if (LIVE.commerce) {
        const order = await api.createOrder(book.id, customer)
        if (order.free && order.purchase) {
          result = order.purchase
        } else {
          setBusy(null)
          const payment = await payWithRazorpay(order).catch(async (err: ApiError) => {
            await api.markFailed(order.orderId, err.code ?? 'PAYMENT_FAILED').catch(() => {})
            throw err
          })
          setBusy('verify')
          result = await api.verifyPayment(order.orderId, payment)
        }
      } else {
        if (!user && accountExists(buyer.email)) throw new ApiError('You already have a Bookera account with this email.', 409, 'ACCOUNT_EXISTS')
        await new Promise((r) => setTimeout(r, 450))
        const order = createMockOrder(book, buyer)
        if (!order.free) {
          setBusy(null)
          await runMockGateway(order)
          setBusy('verify')
          await new Promise((r) => setTimeout(r, 600))
        }
        // Accounts are already live (Phase 6): after a successful (demo) payment the guest's
        // member account is created on the server — never before payment.
        if (!user && LIVE.auth && customer) {
          await signUp(customer.name, customer.email, customer.password, customer.phone).catch((err: ApiError) => {
            throw err.code === 'ACCOUNT_EXISTS'
              ? new ApiError('You already have a Bookera account with this email.', 409, 'ACCOUNT_EXISTS')
              : err
          })
        }
        result = fulfilMockOrder(order, book, buyer)
      }
      completePurchase(result.user, result.entry)
      navigate('/checkout/success', { replace: true, state: { result, bookId: book.id, newMember: !user } })
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError('Something went wrong. Please try again.', 0)
      const message =
        e.code === 'PAYMENT_CANCELLED' || e.code === 'PAYMENT_FAILED'
          ? `${e.code === 'PAYMENT_CANCELLED' ? 'Payment was cancelled.' : e.message} You haven’t been charged${user ? '' : ' and no account was created'}.`
          : e.message
      setFailure({ message, code: e.code })
    } finally {
      setBusy(null)
      setGateway(null)
      submitting.current = false
    }
  }

  const buttonLabel = busy === 'order' ? 'Preparing your order…' : busy === 'verify' ? 'Confirming payment…' : free ? 'Get my free e-book' : `Continue to payment · ${formatPrice(book.price)}`

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <InteractiveGrid className="[mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-page relative flex flex-col gap-6 pt-8 pb-8 sm:flex-row sm:items-center sm:justify-between sm:pt-10">
          <div>
            <Link to={`/ebooks/${book.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden /> Back to book
            </Link>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{free ? 'Get your e-book' : 'Checkout'}</h1>
          </div>
          <Steps step={gateway ? 2 : 1} />
        </div>
      </section>

      <div className="container-page grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_380px] lg:gap-12">
        <form onSubmit={submit} noValidate className="min-w-0 animate-fade-up">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
            {user ? (
              <>
                <h2 className="font-display text-2xl font-bold">You’re buying as</h2>
                <div className="mt-5 flex items-center gap-4 rounded-2xl border border-line bg-paper p-4">
                  <Avatar name={user.name} tone="#3654FF" size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{user.name}</p>
                    <p className="truncate text-sm text-muted">{user.email}</p>
                  </div>
                  <button type="button" onClick={() => signOut()} className="text-sm font-medium text-muted hover:text-ink">
                    Not you?
                  </button>
                </div>
                <p className="mt-4 text-sm text-muted">
                  We’ll add the book to your library and email the PDF to <b className="text-ink">{user.email}</b>.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold">Your details</h2>
                <p className="mt-1 text-sm text-muted">Your e-book is delivered to this email, with instant access to read it online anytime.</p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Input id="co-name" label="Full Name" autoComplete="name" icon={<UserRound className="size-4" />} value={form.name} onChange={set('name')} error={errors.name} required wrapperClassName="sm:col-span-2" />
                  <Input id="co-email" label="Email" type="email" autoComplete="email" icon={<Mail className="size-4" />} value={form.email} onChange={set('email')} error={errors.email} required />
                  <Input id="co-phone" label="Phone Number" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" icon={<Phone className="size-4" />} value={form.phone} onChange={set('phone')} error={errors.phone} required />
                  <Input id="co-password" label="Password" type="password" autoComplete="new-password" icon={<Lock className="size-4" />} placeholder="At least 8 characters" value={form.password} onChange={set('password')} error={errors.password} hint="Use this with your email to open your e-books later." required />
                  <Input id="co-confirm" label="Confirm Password" type="password" autoComplete="new-password" icon={<Lock className="size-4" />} value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />
                </div>
                <label className="mt-5 flex items-start gap-3 text-sm text-ink-2">
                  <input
                    id="co-terms"
                    type="checkbox"
                    className="mt-0.5 size-4 rounded accent-indigo"
                    checked={form.terms}
                    onChange={(e) => {
                      setForm({ ...form, terms: e.target.checked })
                      if (errors.terms) setErrors(({ terms: _t, ...rest }) => rest)
                    }}
                  />
                  <span>
                    I agree to the <a className="font-medium text-indigo hover:underline" href="#terms">Terms</a> and{' '}
                    <a className="font-medium text-indigo hover:underline" href="#privacy">Privacy Policy</a>.
                  </span>
                </label>
                {errors.terms && <p className="mt-1.5 text-[13px] font-medium text-coral-700">{errors.terms}</p>}
                <p className="mt-5 text-sm text-muted">
                  Already bought from us?{' '}
                  <Link to="/login" state={{ from: location.pathname }} className="font-semibold text-indigo hover:underline">
                    Log in
                  </Link>
                </p>
              </>
            )}

            {failure && (
              <div role="alert" className="mt-6 flex animate-pop-in gap-3 rounded-2xl border border-coral/30 bg-coral-50 p-4 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral-700" aria-hidden />
                <div>
                  <p className="font-semibold text-coral-700">{failure.code === 'ACCOUNT_EXISTS' ? 'Welcome back!' : 'Payment not completed'}</p>
                  <p className="mt-0.5 text-ink-2">
                    {failure.message}{' '}
                    {failure.code === 'ACCOUNT_EXISTS' && (
                      <Link to="/login" state={{ from: location.pathname }} className="font-semibold text-indigo hover:underline">
                        Log in to continue →
                      </Link>
                    )}
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="mt-7 w-full" disabled={!!busy || !!gateway}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : free ? <Sparkles className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
              {buttonLabel}
            </Button>
            {!free && <p className="mt-3 text-center text-xs text-muted">You’ll complete payment securely with Razorpay.</p>}
          </div>
        </form>

        <OrderSummary book={book} />
      </div>

      {gateway && (
        <MockGateway
          order={gateway.order}
          onSuccess={() => gateway.resolve()}
          onFailure={() => gateway.reject(new ApiError('Your bank declined the payment.', 0, 'PAYMENT_FAILED'))}
          onDismiss={() => gateway.reject(new ApiError('Payment was cancelled.', 0, 'PAYMENT_CANCELLED'))}
        />
      )}
    </>
  )
}

/* ─────────────────────────── Success ─────────────────────────── */

export function CheckoutSuccess() {
  const { getBook } = useStore()
  const toast = useToast()
  const state = useLocation().state as { result?: PurchaseResult; bookId?: string; newMember?: boolean } | null
  const [downloading, setDownloading] = useState(false)
  const book = state?.bookId ? getBook(state.bookId) : undefined
  if (!state?.result || !book) return <Navigate to="/dashboard" replace />

  const { result } = state
  const free = (result.entry.amount ?? 0) === 0
  const author = getAuthor(book.authorId)

  return (
    <section className="relative overflow-hidden">
      <InteractiveGrid className="[mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_70%)]" />
      <div className="container-page relative py-14 sm:py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="mx-auto">
            <Steps step={3} />
          </div>
          <span className="relative mt-10 grid size-20 animate-pop-in place-items-center rounded-full bg-leaf text-white shadow-[0_18px_40px_-16px_rgb(31_138_91/0.8)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-leaf/25" aria-hidden />
            <Check className="relative size-9" strokeWidth={3} aria-hidden />
          </span>
          <h1 className="mt-8 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{free ? 'It’s yours! 📚' : 'Payment successful 🎉'}</h1>
          <p className="mt-3 text-lg text-muted">
            <b className="text-ink">{book.title}</b> is now in your library.
          </p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink-2 shadow-card">
            <Mail className="size-4 text-indigo" aria-hidden />
            {LIVE.commerce
              ? result.emailSent
                ? `We’ve emailed your PDF to ${result.user.email}`
                : `Your email is on its way to ${result.user.email}`
              : `Live site: the PDF is emailed to ${result.user.email}`}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-[180px_1fr]">
          <BookCover title={book.title} author={author?.name} category={book.category} cover={book.cover} image={book.coverImage} className="mx-auto w-40 animate-pop-in sm:w-full" />
          <div className="rounded-3xl border border-line bg-white p-6 shadow-card">
            <dl className="space-y-2.5 text-sm">
              {[
                ['Order', result.orderId],
                ['Paid', free ? 'Free' : formatPrice(result.entry.amount ?? book.price)],
                ['Date', formatDate(result.entry.addedAt)],
                ['Delivered to', result.user.email],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line/70 pb-2.5 last:border-0 last:pb-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {state.newMember && (
              <p className="mt-4 flex gap-2 rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-600">
                <Library className="mt-0.5 size-4 shrink-0" aria-hidden />
                Your member library is ready. Sign in anytime with {result.user.email} and the password you chose.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={`/read/${book.id}`} className="sm:flex-1">
                <BookOpen className="size-4" aria-hidden /> Read now
              </ButtonLink>
              <Button
                variant="outline"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true)
                  try {
                    await downloadBookPdf(book)
                  } catch {
                    toast({ title: 'Download failed', description: 'Please try again from your library.', tone: 'error' })
                  } finally {
                    setDownloading(false)
                  }
                }}
              >
                {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />} Download PDF
              </Button>
            </div>
            <Link to="/dashboard" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-indigo">
              Go to my library →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
