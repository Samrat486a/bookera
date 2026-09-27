import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, Phone, UserRound } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { API_MODE } from '../lib/api'
import { fieldErrors, isValidPhone } from '../lib/checkout'
import { useToast } from '../context/ToastContext'
import { getAuthor } from '../data/authors'
import { cx } from '../lib/format'
import { Button, ButtonLink } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { BookCover } from '../components/ebooks/BookCover'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function AuthShell({ children, quote }: { children: ReactNode; quote: { text: string; by: string } }) {
  const { getBook } = useStore()
  const covers = ['the-learning-code', 'modern-javascript-development', 'the-lantern-house'].map((id) => getBook(id)).filter((b) => !!b)
  return (
    <div className="container-page grid gap-10 py-10 sm:py-16 lg:grid-cols-[1fr_1fr] lg:items-stretch lg:gap-14">
      <div className="mx-auto w-full max-w-md animate-fade-up lg:py-8">{children}</div>

      <aside className="relative hidden overflow-hidden rounded-[36px] bg-ink p-10 text-paper lg:flex lg:flex-col" aria-hidden>
        <div className="bg-dots-light absolute inset-0 opacity-20" />
        <div className="absolute -right-20 -bottom-20 size-80 rounded-full bg-indigo/70 blur-3xl" />
        <div className="relative flex flex-1 items-center justify-center">
          <div className="relative h-72 w-full max-w-sm">
            {covers.map((b, i) => (
              <div
                key={b.id}
                className="absolute w-40"
                style={{ left: `calc(50% - 80px + ${(i - 1) * 110}px)`, top: `calc(50% - 120px + ${i === 1 ? -20 : 16}px)`, zIndex: i === 1 ? 2 : 1 }}
              >
                <div className="animate-float" style={{ ['--r' as string]: `${(i - 1) * 8}deg`, animationDelay: `${-i * 1.8}s` }}>
                  <BookCover title={b.title} category={b.category} author={getAuthor(b.authorId)?.name} cover={b.cover} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <figure className="relative mt-10">
          <blockquote className="font-display text-2xl leading-snug font-medium">“{quote.text}”</blockquote>
          <figcaption className="mt-3 text-sm text-paper/60">{quote.by}</figcaption>
        </figure>
      </aside>
    </div>
  )
}

function PasswordInput(props: Parameters<typeof Input>[0]) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} icon={<Lock className="size-4" />} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className={cx('absolute right-2 grid size-9 place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink', props.label ? 'top-[30px]' : 'top-1.5')}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

/* ─────────────────────────── Login ─────────────────────────── */

export function Login() {
  const { signIn } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSending, setResetSending] = useState(false)
  const { requestPasswordReset } = useStore()

  const sendReset = async () => {
    setResetSending(true)
    try {
      await requestPasswordReset(resetEmail.trim())
      setForgotOpen(false)
      toast({
        title: 'Check your inbox',
        description: API_MODE === 'live' ? 'If an account exists for that email, a reset link is on its way. It expires in 60 minutes.' : 'Demo mode — no email is sent.',
        tone: 'info',
      })
    } catch (err) {
      toast({ title: 'Couldn’t send the link', description: err instanceof Error ? err.message : 'Please try again.', tone: 'error' })
    } finally {
      setResetSending(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.email) errs.email = 'Please enter your email.'
    else if (!EMAIL_RE.test(form.email)) errs.email = 'That doesn’t look like a valid email.'
    if (!form.password) errs.password = 'Please enter your password.'
    
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      const u = await signIn(form.email.trim(), form.password)
      toast({ title: `Welcome back, ${u.name.split(' ')[0]}!`, description: 'You’re signed in.' })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? (u.role === 'admin' ? '/admin' : '/dashboard'), { replace: true })
    } catch (err) {
      setErrors(fieldErrors(err) ?? { password: err instanceof Error ? err.message : 'Couldn’t sign you in. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell quote={{ text: 'Reading is to the mind what exercise is to the body.', by: 'Joseph Addison' }}>
      <h1 className="text-4xl font-bold sm:text-5xl">Welcome back</h1>
      <p className="mt-3 text-muted">Sign in to continue reading and managing your digital library.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="size-4" />}
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-ink-2">
            <input type="checkbox" className="size-4 rounded accent-indigo" defaultChecked /> Remember me
          </label>
          <button type="button" onClick={() => setForgotOpen(true)} className="font-medium text-indigo hover:underline">
            Forgot Password?
          </button>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {loading ? 'Signing in…' : 'Login'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Don’t have an account?{' '}
        <Link to="/signup" className="font-semibold text-indigo hover:underline">
          Sign Up
        </Link>
      </p>
      {API_MODE === 'mock' && (
        <p className="mt-6 rounded-2xl border border-dashed border-line-2 bg-white/60 p-3 text-center text-xs text-muted">
          Demo mode: any email and password signs you in. Sample member with purchases: <b className="text-ink">maya@bookera.demo</b>
        </p>
      )}

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        size="sm"
        title="Reset your password"
        description="Enter the email you signed up with and we’ll send you a reset link."
        footer={
          <>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!EMAIL_RE.test(resetEmail.trim()) || resetSending} onClick={sendReset}>
              {resetSending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {resetSending ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        }
      >
        <Input label="Email" type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} icon={<Mail className="size-4" />} />
      </Modal>
    </AuthShell>
  )
}

/* ─────────────────────────── Signup ─────────────────────────── */

function strength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

export function Signup() {
  const { signUp } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', terms: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })
  const pwScore = strength(form.password)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (form.name.trim().length < 2) errs.name = 'Please enter your full name.'
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Please enter a valid email address.'
    if (!isValidPhone(form.phone)) errs.phone = 'Please enter a valid phone number (10–15 digits).'
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.'
    if (form.confirm !== form.password || !form.confirm) errs.confirm = 'Passwords don’t match.'
    if (!form.terms) errs.terms = 'Please accept the terms to continue.'
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.getElementById(`su-${Object.keys(errs)[0]}`)?.focus()
      return
    }
    setLoading(true)
    try {
      await signUp(form.name.trim(), form.email.trim().toLowerCase(), form.password, form.phone.trim())
      toast({ title: 'Account created 🎉', description: 'Your library is ready.' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const server = fieldErrors(err) ?? { email: err instanceof Error ? err.message : 'Couldn’t create your account. Please try again.' }
      setErrors(server)
      document.getElementById(`su-${Object.keys(server)[0]}`)?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell quote={{ text: 'A room without books is like a body without a soul.', by: 'Attributed to Cicero' }}>
      <h1 className="text-4xl font-bold sm:text-5xl">Join Bookera</h1>
      <p className="mt-3 text-muted">Create your account and start building your digital library.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <Input id="su-name" label="Full Name" autoComplete="name" placeholder="Maya Patel" icon={<UserRound className="size-4" />} value={form.name} onChange={set('name')} error={errors.name} required />
        <Input id="su-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail className="size-4" />} value={form.email} onChange={set('email')} error={errors.email} required />
        <Input id="su-phone" label="Phone Number" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" icon={<Phone className="size-4" />} value={form.phone} onChange={set('phone')} error={errors.phone} required />
        <div>
          <PasswordInput id="su-password" label="Password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} error={errors.password} required />
          {form.password && (
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cx('h-1 flex-1 rounded-full transition', i < pwScore ? (pwScore <= 1 ? 'bg-coral' : pwScore === 2 ? 'bg-saffron' : 'bg-leaf') : 'bg-line')} />
                ))}
              </div>
              <span className="w-14 text-right text-xs text-muted">{['Weak', 'Weak', 'Okay', 'Good', 'Strong'][pwScore]}</span>
            </div>
          )}
        </div>
        <PasswordInput id="su-confirm" label="Confirm Password" autoComplete="new-password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />

        <div>
          <label className="flex items-start gap-3 text-sm text-ink-2">
            <input
              id="su-terms"
              type="checkbox"
              className="mt-0.5 size-4 rounded accent-indigo"
              checked={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.checked })}
              aria-invalid={!!errors.terms || undefined}
            />
            <span>
              I agree to the <a className="font-medium text-indigo hover:underline" href="#terms">Terms</a> and{' '}
              <a className="font-medium text-indigo hover:underline" href="#privacy">Privacy Policy</a>.
            </span>
          </label>
          {errors.terms && <p className="mt-1.5 text-[13px] font-medium text-coral-700">{errors.terms}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo hover:underline">
          Login
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-muted">
        Want to publish your book?{' '}
        <Link to="/publish" className="font-semibold text-ink hover:text-indigo">
          Talk to our team →
        </Link>
      </p>
    </AuthShell>
  )
}

/* ─────────────────────────── Reset password ─────────────────────────── */

/** /reset-password?token=… — opened from the password-reset email. */
export function ResetPassword() {
  const { resetPassword } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const tokenLooksValid = /^[a-f0-9]{64}$/.test(token)
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [expired, setExpired] = useState(!tokenLooksValid)
  const pwScore = strength(form.password)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.'
    if (!form.confirm || form.confirm !== form.password) errs.confirm = 'Passwords don’t match.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    try {
      const u = await resetPassword(token, form.password)
      toast({ title: 'Password updated', description: `You’re signed in, ${u.name.split(' ')[0]}. Other devices have been signed out.` })
      navigate(u.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'RESET_TOKEN_INVALID') setExpired(true)
      else setErrors(fieldErrors(err) ?? { password: err instanceof Error ? err.message : 'Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell quote={{ text: 'Reading is to the mind what exercise is to the body.', by: 'Joseph Addison' }}>
      <span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo">
        <KeyRound className="size-5" aria-hidden />
      </span>
      {expired ? (
        <>
          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Link expired</h1>
          <p className="mt-3 text-muted">This reset link is invalid, has already been used, or is older than 60 minutes. Request a new one and use it straight away.</p>
          <ButtonLink to="/login" size="lg" className="mt-8 w-full">
            Back to login
          </ButtonLink>
          <p className="mt-4 text-center text-sm text-muted">On the login page, choose “Forgot Password?” to get a fresh link.</p>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Choose a new password</h1>
          <p className="mt-3 text-muted">Pick something you haven’t used here before. You’ll be signed in right after.</p>
          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
            <div>
              <PasswordInput id="rp-password" label="New Password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} required />
              {form.password && (
                <div className="mt-2 flex items-center gap-2" aria-live="polite">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={cx('h-1 flex-1 rounded-full transition', i < pwScore ? (pwScore <= 1 ? 'bg-coral' : pwScore === 2 ? 'bg-saffron' : 'bg-leaf') : 'bg-line')} />
                    ))}
                  </div>
                  <span className="w-14 text-right text-xs text-muted">{['Weak', 'Weak', 'Okay', 'Good', 'Strong'][pwScore]}</span>
                </div>
              )}
            </div>
            <PasswordInput id="rp-confirm" label="Confirm New Password" autoComplete="new-password" placeholder="Repeat password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} required />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
