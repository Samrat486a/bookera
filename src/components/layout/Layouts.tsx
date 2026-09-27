import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, LayoutGrid, LogOut, Menu, PlusCircle, UserRound, Users, X } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { cx } from '../../lib/format'
import type { Role } from '../../types'
import { API_MODE } from '../../lib/api'
import { Button, ButtonLink } from '../ui/Button'
import { Avatar } from '../ui/States'
import { Footer } from './Footer'
import { Logo, LogoMark } from './Brand'
import { Navbar } from './Navbar'

export function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

export function SiteLayout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main" key={pathname} className="flex-1 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/** Friendly gate for pages that need a signed-in role (mock auth only). */
export function RequireRole({ role, children }: { role: Role | 'any'; children: ReactNode }) {
  const { user, login, authReady } = useStore()
  const location = useLocation()
  if (user && (role === 'any' || user.role === role)) return <>{children}</>
  if (!authReady) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-sm text-muted" role="status">
        Loading your account…
      </div>
    )
  }

  const isAdmin = role === 'admin'
  return (
    <div className="container-page grid min-h-[70dvh] place-items-center py-16">
      <div className="w-full max-w-lg animate-pop-in rounded-3xl border border-line bg-white p-8 text-center shadow-card sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-paper-2">
          <LogoMark className="size-9" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">{isAdmin ? 'Admin access only' : 'Sign in to open your library'}</h1>
        <p className="mt-3 text-muted">
          {isAdmin
            ? 'The admin panel is reserved for the Bookera team.'
            : 'Your purchased e-books and reading progress live here. Sign in with the email you used at checkout.'}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {API_MODE === 'mock' && (
            <Button
              variant="primary"
              onClick={() =>
                login(
                  isAdmin
                    ? { name: 'Bookera Admin', email: 'admin@bookera.demo', role: 'admin' }
                    : { name: 'Maya Patel', email: 'maya@bookera.demo', role: 'reader' },
                )
              }
            >
              Continue as demo {isAdmin ? 'admin' : 'reader'}
            </Button>
          )}
          <ButtonLink to="/login" state={{ from: location.pathname }} variant="outline">
            Go to Login
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/books', label: 'E-books', icon: BookOpen, end: true },
  { to: '/admin/books/new', label: 'Add E-book', icon: PlusCircle },
  { to: '/admin/readers', label: 'Readers', icon: Users },
  { to: '/admin/profile', label: 'Profile', icon: UserRound },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut: logout } = useStore()
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-8">
        <Logo to="/admin" />
        <p className="mt-2 pl-[42px] text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Admin Studio</p>
      </div>
      <nav aria-label="Admin" className="flex-1 px-3">
        <ul className="space-y-1">
          {adminNav.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition',
                    isActive ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
                  )
                }
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium text-coral-700 transition hover:bg-coral-50"
            >
              <LogOut className="size-[18px]" aria-hidden /> Logout
            </button>
          </li>
        </ul>
      </nav>
      <div className="m-3 rounded-2xl border border-line bg-paper p-4">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar name={user.name} tone="#FFAE1F" size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
        )}
        <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-indigo">
          <ArrowLeft className="size-4" /> Back to Bookera
        </Link>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  return (
    <RequireRole role="admin">
      <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[264px_1fr]">
        <aside className="sticky top-0 hidden h-dvh border-r border-line bg-white lg:block">
          <Sidebar />
        </aside>

        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-paper/[0.97] px-4 lg:hidden">
          <Logo to="/admin" />
          <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full border border-line bg-white" aria-label="Open admin menu">
            <Menu className="size-5" />
          </button>
        </div>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs animate-slide-in bg-white shadow-lift">
              <button onClick={() => setOpen(false)} className="absolute top-5 right-4 grid size-9 place-items-center rounded-full hover:bg-paper" aria-label="Close menu">
                <X className="size-5" />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}

        <main id="main" key={pathname} className="min-w-0 animate-fade-in px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </RequireRole>
  )
}

/** Shared page heading for dashboard-style screens. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  )
}
