import { Link } from 'react-router-dom'
import { cx } from '../../lib/format'

/** Bookera mark: an open book whose right page is a lit screen, with a spark of knowledge. */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill={inverted ? '#F6F4EE' : '#14171B'} />
      <path d="M7.5 10c3.2-1.1 6-.7 8.5 1.3v12.9c-2.5-2-5.3-2.4-8.5-1.3z" fill={inverted ? '#14171B' : '#F6F4EE'} />
      <path d="M24.5 10c-3.2-1.1-6-.7-8.5 1.3v12.9c2.5-2 5.3-2.4 8.5-1.3z" fill="#3654FF" />
      <path d="M18.6 15.2h3.6M18.6 18h2.4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <circle cx="24" cy="8" r="2.6" fill="#FFAE1F" />
    </svg>
  )
}

export function Logo({ className, inverted, to = '/' }: { className?: string; inverted?: boolean; to?: string }) {
  return (
    <Link to={to} className={cx('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label="Bookera home">
      <LogoMark inverted={inverted} />
      <span className={cx('font-display text-[21px] leading-none font-bold tracking-[-0.03em]', inverted ? 'text-paper' : 'text-ink')}>
        bookera<span className="text-saffron">.</span>
      </span>
    </Link>
  )
}

const socialPaths = {
  GitHub:
    'M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z',
  LinkedIn:
    'M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.6V9h3.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z',
  Instagram:
    'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 4 3.9 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z',
  X: 'M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.8 2.3h7l4.8 6.4zm-1.2 17.9h1.9L7 4.2H5z',
} as const

export function SocialIcon({ name, className }: { name: keyof typeof socialPaths; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx('size-4', className)} fill="currentColor" aria-hidden>
      <path d={socialPaths[name]} />
    </svg>
  )
}

export const socials = [
  { name: 'GitHub' as const, href: 'https://github.com' },
  { name: 'LinkedIn' as const, href: 'https://linkedin.com' },
  { name: 'Instagram' as const, href: 'https://instagram.com' },
  { name: 'X' as const, href: 'https://x.com', label: 'X (Twitter)' },
]
