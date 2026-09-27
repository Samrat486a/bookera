import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Logo, SocialIcon, socials } from './Brand'
import { GlowWordmark } from './GlowWordmark'

const columns = [
  {
    title: 'Platform',
    links: [
      { to: '/', label: 'Home' },
      { to: '/ebooks', label: 'E-books' },
      { to: '/categories', label: 'Categories' },
      { to: '/about', label: 'About' },
    ],
  },
  {
    title: 'For Readers',
    links: [
      { to: '/login', label: 'Login' },
      { to: '/signup', label: 'Sign Up' },
      { to: '/dashboard', label: 'My Library' },
    ],
  },
  {
    title: 'Publish With Us',
    links: [
      { to: '/publish', label: 'Publish Your Book' },
      { to: '/publish#how', label: 'How It Works' },
      { to: '/publish#contact', label: 'Contact the Team' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
      <div className="container-page relative pt-16 pb-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Logo inverted />
            <p className="mt-5 text-[15px] leading-relaxed text-paper/65">Your digital library for stories, ideas, and knowledge.</p>
            <ul className="mt-6 flex gap-2" aria-label="Social media">
              {socials.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label ?? s.name}
                    className="grid size-10 place-items-center rounded-full border border-paper/15 text-paper/80 transition hover:border-saffron hover:bg-saffron hover:text-ink"
                  >
                    <SocialIcon name={s.name} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h2 className="font-sans text-xs font-semibold tracking-[0.14em] text-paper/45 uppercase">{col.title}</h2>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="group inline-flex items-center gap-1 text-[15px] text-paper/80 transition hover:text-white">
                        {l.label}
                        <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <GlowWordmark />

        <div className="mt-6 flex flex-col gap-3 border-t border-paper/10 pt-6 text-sm text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Bookera. All rights reserved.</p>
          <p>Demo experience · Books, authors &amp; stats shown are illustrative.</p>
        </div>
      </div>
    </footer>
  )
}
