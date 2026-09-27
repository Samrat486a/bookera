import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, Library, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { useToast } from '../../context/ToastContext'
import { cx } from '../../lib/format'
import { ButtonLink } from '../ui/Button'
import { Avatar } from '../ui/States'
import { Logo } from './Brand'

export const mainNav = [
  { to: '/', label: 'Home', end: true },
  { to: '/ebooks', label: 'E-books' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About' },
]

function UserMenu() {
  const { user, signOut: logout } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-paper'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pr-2.5 pl-1 transition hover:border-line-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={user.name} tone={user.role === 'admin' ? '#FFAE1F' : '#3654FF'} size="sm" />
        <ChevronDown className={cx('size-4 text-muted transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 animate-pop-in rounded-2xl border border-line bg-white p-2 shadow-lift">
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <span className="mt-2 inline-block rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2 capitalize">{user.role === 'admin' ? 'Admin' : 'Reader'}</span>
          </div>
          <div className="pt-2">
            {user.role === 'admin' ? (
              <Link role="menuitem" to="/admin" className={item} onClick={() => setOpen(false)}>
                <LayoutDashboard className="size-4 text-muted" /> Admin Panel
              </Link>
            ) : (
              <Link role="menuitem" to="/dashboard" className={item} onClick={() => setOpen(false)}>
                <Library className="size-4 text-muted" /> My Library
              </Link>
            )}
            <Link role="menuitem" to="/profile" className={item} onClick={() => setOpen(false)}>
              <UserRound className="size-4 text-muted" /> Profile
            </Link>
            <button
              role="menuitem"
              className={cx(item, 'text-coral-700')}
              onClick={() => {
                logout()
                setOpen(false)
                toast({ title: 'Signed out', description: 'See you soon — your library will be waiting.', tone: 'info' })
                navigate('/')
              }}
            >
              <LogOut className="size-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { user, signOut: logout } = useStore()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      'relative rounded-full px-3.5 py-2 text-[14.5px] font-medium transition',
      isActive ? 'text-ink after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-saffron' : 'text-ink-2 hover:bg-ink/5 hover:text-ink',
    )

  return (
    <>
    <header
      className={cx(
        'sticky top-0 z-50 border-b transition-colors duration-300',
        scrolled || open ? 'border-line bg-paper shadow-[0_6px_20px_-18px_rgb(20_23_27/0.5)]' : 'border-transparent bg-paper',
      )}
    >
      <a href="#main" className="sr-only rounded-lg bg-ink px-4 py-2 text-paper focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60]">
        Skip to content
      </a>
      <nav className="container-page flex h-[68px] items-center justify-between gap-4" aria-label="Main">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {mainNav.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.end} className={linkClass}>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          {!user && (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">
                Login
              </ButtonLink>
              <ButtonLink to="/signup" variant="dark" size="sm">
                Sign Up
              </ButtonLink>
            </>
          )}
          {user?.role === 'reader' && (
            <ButtonLink to="/dashboard" variant="outline" size="sm">
              <Library className="size-4" /> My Library
            </ButtonLink>
          )}
          {user?.role === 'admin' && (
            <ButtonLink to="/admin" variant="outline" size="sm">
              <LayoutDashboard className="size-4" /> Admin Panel
            </ButtonLink>
          )}
          <UserMenu />
        </div>

        <button
          className="grid size-11 place-items-center rounded-full border border-line bg-white lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
    </header>

      {/* Mobile menu — rendered outside <header> because its backdrop-filter would trap position:fixed */}
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-[68px] bottom-0 z-50 animate-fade-in overflow-y-auto border-t border-line bg-paper lg:hidden">
          <div className="container-page flex min-h-full flex-col py-6">
            <ul className="flex flex-col">
              {mainNav.map((n, i) => (
                <li key={n.to} className="animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      cx('flex items-center justify-between border-b border-line py-4 font-display text-2xl font-semibold', isActive ? 'text-indigo' : 'text-ink')
                    }
                  >
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              {!user ? (
                <>
                  <ButtonLink to="/signup" variant="primary" size="lg">
                    Sign Up — it’s free
                  </ButtonLink>
                  <ButtonLink to="/login" variant="outline" size="lg">
                    Login
                  </ButtonLink>
                </>
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                    <Avatar name={user.name} tone={user.role === 'admin' ? '#FFAE1F' : '#3654FF'} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                  </div>
                  <ButtonLink to={user.role === 'admin' ? '/admin' : '/dashboard'} variant="primary" size="lg">
                    {user.role === 'admin' ? 'Admin Panel' : 'My Library'}
                  </ButtonLink>
                  <ButtonLink to="/profile" variant="outline" size="lg">
                    Profile
                  </ButtonLink>
                  <button
                    className="h-13 rounded-full text-[15px] font-semibold text-coral-700 hover:bg-coral-50"
                    onClick={() => {
                      logout()
                      navigate('/')
                    }}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
            <p className="mt-auto pt-10 text-sm text-muted">Discover. Read. Learn.</p>
          </div>
        </div>
      )}
    </>
  )
}
