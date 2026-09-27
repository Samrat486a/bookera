import type { CoverDesign, CoverPattern } from '../../types'
import { cx } from '../../lib/format'

/**
 * Generative, typographic e-book covers. Each book carries a small design
 * spec (colours + motif) so the whole catalogue feels like one publishing
 * house, without relying on stock imagery.
 */

function Motif({ pattern, fg, accent }: { pattern: CoverPattern; fg: string; accent: string }) {
  switch (pattern) {
    case 'grid':
      return (
        <g>
          {Array.from({ length: 9 }, (_, i) => (
            <path key={`v${i}`} d={`M${i * 25} 130V300`} stroke={fg} strokeOpacity="0.18" strokeWidth="1" />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <path key={`h${i}`} d={`M0 ${130 + i * 25}H200`} stroke={fg} strokeOpacity="0.18" strokeWidth="1" />
          ))}
          <rect x="100" y="180" width="75" height="75" fill={accent} />
          <rect x="50" y="230" width="50" height="50" fill={fg} fillOpacity="0.9" />
          <circle cx="150" cy="155" r="12" fill="none" stroke={accent} strokeWidth="3" />
        </g>
      )
    case 'rings':
      return (
        <g fill="none">
          {[18, 36, 54, 72, 90, 108].map((r, i) => (
            <circle key={r} cx="150" cy="235" r={r} stroke={i === 2 ? accent : fg} strokeOpacity={i === 2 ? 1 : 0.35} strokeWidth={i === 2 ? 5 : 1.5} />
          ))}
          <circle cx="150" cy="235" r="8" fill={accent} />
        </g>
      )
    case 'stripes':
      return (
        <g>
          <clipPath id="clip-stripes">
            <rect x="0" y="150" width="200" height="150" />
          </clipPath>
          <g clipPath="url(#clip-stripes)">
            {Array.from({ length: 16 }, (_, i) => (
              <path key={i} d={`M${-100 + i * 22} 300L${i * 22} 150`} stroke={i % 4 === 1 ? accent : fg} strokeOpacity={i % 4 === 1 ? 1 : 0.28} strokeWidth={i % 4 === 1 ? 9 : 5} />
            ))}
          </g>
          <rect x="24" y="208" width="72" height="36" fill={accent} />
        </g>
      )
    case 'code':
      return (
        <g>
          <text x="22" y="258" fontFamily="Space Grotesk, monospace" fontSize="96" fontWeight="700" fill={accent}>
            {'{ }'}
          </text>
          {[
            [22, 150, 70],
            [36, 162, 96],
            [36, 174, 52],
            [50, 186, 80],
            [36, 198, 40],
            [22, 210, 30],
          ].map(([x, y, w], i) => (
            <rect key={i} x={x} y={y} width={w} height="5" rx="2.5" fill={i === 2 ? accent : fg} fillOpacity={i === 2 ? 1 : 0.4} />
          ))}
          <rect x="140" y="150" width="3" height="60" fill={accent} opacity="0.9" />
        </g>
      )
    case 'wave':
      return (
        <g fill="none">
          {Array.from({ length: 8 }, (_, i) => {
            const y = 170 + i * 16
            return (
              <path
                key={i}
                d={`M-10 ${y} C 30 ${y - 22}, 60 ${y + 22}, 100 ${y} S 170 ${y - 22}, 210 ${y}`}
                stroke={i === 3 ? accent : fg}
                strokeOpacity={i === 3 ? 1 : 0.4}
                strokeWidth={i === 3 ? 5 : 2}
              />
            )
          })}
        </g>
      )
    case 'blocks':
      return (
        <g>
          <rect x="22" y="170" width="70" height="104" fill={accent} />
          <circle cx="138" cy="206" r="36" fill={fg} fillOpacity="0.92" />
          <path d="M100 274h78v-32a39 39 0 0 0-78 0z" fill="none" stroke={accent} strokeWidth="4" />
          <rect x="102" y="262" width="76" height="12" fill={fg} fillOpacity="0.2" />
        </g>
      )
    case 'orbit':
      return (
        <g fill="none">
          <circle cx="110" cy="220" r="30" fill={accent} />
          <ellipse cx="110" cy="220" rx="84" ry="30" stroke={fg} strokeOpacity="0.55" strokeWidth="1.5" transform="rotate(-18 110 220)" />
          <ellipse cx="110" cy="220" rx="62" ry="58" stroke={fg} strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="3 5" />
          <circle cx="178" cy="195" r="6" fill={fg} />
          <circle cx="48" cy="250" r="4" fill={accent} />
          {[
            [30, 160],
            [170, 270],
            [60, 290],
            [184, 150],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.6" fill={fg} opacity="0.7" />
          ))}
        </g>
      )
    case 'arch':
      return (
        <g>
          <path d="M40 300V220a60 60 0 0 1 120 0v80z" fill={accent} fillOpacity="0.95" />
          <path d="M64 300v-76a36 36 0 0 1 72 0v76z" fill="none" stroke={fg} strokeOpacity="0.6" strokeWidth="2" />
          <path d="M88 300v-70a12 12 0 0 1 24 0v70z" fill={fg} fillOpacity="0.85" />
          <circle cx="160" cy="160" r="9" fill={accent} />
        </g>
      )
    case 'dots':
      return (
        <g>
          {Array.from({ length: 7 }, (_, r) =>
            Array.from({ length: 9 }, (_, c) => <circle key={`${r}-${c}`} cx={16 + c * 21} cy={160 + r * 20} r="2.2" fill={fg} opacity="0.35" />),
          )}
          <circle cx="132" cy="222" r="42" fill={accent} />
          <circle cx="72" cy="252" r="20" fill="none" stroke={fg} strokeWidth="3" />
        </g>
      )
    case 'sun':
      return (
        <g>
          {Array.from({ length: 13 }, (_, i) => {
            const a = Math.PI + (i * Math.PI) / 12
            return (
              <path
                key={i}
                d={`M${100 + Math.cos(a) * 58} ${270 + Math.sin(a) * 58}L${100 + Math.cos(a) * 96} ${270 + Math.sin(a) * 96}`}
                stroke={fg}
                strokeOpacity="0.5"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )
          })}
          <path d="M52 270a48 48 0 0 1 96 0z" fill={accent} />
          <rect x="0" y="270" width="200" height="30" fill={fg} fillOpacity="0.9" />
        </g>
      )
  }
}

interface BookCoverProps {
  title: string
  subtitle?: string
  author?: string
  category?: string
  cover: CoverDesign
  image?: string
  className?: string
  /** Visual size preset — adjusts shadow and radius. */
  size?: 'sm' | 'md' | 'lg'
  alt?: string
}

export function BookCover({ title, subtitle, author, category, cover, image, className, size = 'md', alt }: BookCoverProps) {
  const radius = size === 'sm' ? 'rounded-[6px]' : 'rounded-[10px]'
  return (
    <div
      className={cx('@container relative aspect-[2/3] overflow-hidden shadow-book select-none', radius, className)}
      style={{ background: cover.bg, color: cover.fg }}
      role="img"
      aria-label={alt ?? `Cover of ${title}${author ? ` by ${author}` : ''}`}
    >
      {image ? (
        <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
            <Motif pattern={cover.pattern} fg={cover.fg} accent={cover.accent} />
          </svg>
          <div className="relative flex h-full flex-col p-[9cqw] pl-[12cqw]">
            <div className="flex items-center justify-between gap-2 text-[4.2cqw] font-semibold tracking-[0.16em] uppercase opacity-75">
              <span className="truncate">{category}</span>
              <span aria-hidden className="shrink-0 font-display tracking-normal">B/</span>
            </div>
            <p className="mt-[7cqw] font-display text-[11.5cqw] leading-[1.02] font-bold tracking-[-0.02em] text-balance">{title}</p>
            {subtitle && <p className="mt-[3cqw] text-[5cqw] leading-snug opacity-80">{subtitle}</p>}
            {author && <p className="mt-auto text-[5cqw] font-semibold tracking-[0.04em] uppercase mix-blend-normal" style={{ color: cover.fg }}>
              <span className="rounded-[1cqw] px-[1.5cqw] py-[0.5cqw]" style={{ background: cover.bg }}>{author}</span>
            </p>}
          </div>
        </>
      )}
      {/* Spine + page-edge lighting */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[6cqw] bg-linear-to-r from-black/25 via-white/10 to-transparent" aria-hidden />
      <span className="pointer-events-none absolute inset-y-0 left-[6cqw] w-px bg-white/15" aria-hidden />
      <span className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-black/10" aria-hidden />
    </div>
  )
}
