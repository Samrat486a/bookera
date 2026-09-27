import type { CSSProperties, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Atom,
  BrainCircuit,
  Briefcase,
  CodeXml,
  Cpu,
  Feather,
  GraduationCap,
  Landmark,
  PenTool,
  Rocket,
  Sprout,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Category } from '../../types'
import { cx } from '../../lib/format'

export const categoryIcons: Record<string, LucideIcon> = {
  Programming: CodeXml,
  'Artificial Intelligence': BrainCircuit,
  Technology: Cpu,
  Business: Briefcase,
  Education: GraduationCap,
  'Self Development': Sprout,
  Fiction: Feather,
  Science: Atom,
  Finance: TrendingUp,
  Design: PenTool,
  History: Landmark,
  Entrepreneurship: Rocket,
}

export function CategoryCard({ category, count, className, style, compact }: { category: Category; count: number; className?: string; style?: CSSProperties; compact?: boolean }) {
  const Icon = categoryIcons[category.name] ?? BookOpen

  // cursor-following spotlight
  const track = (e: MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <Link
      to={`/ebooks?category=${encodeURIComponent(category.name)}`}
      onMouseMove={track}
      className={cx(
        'group relative isolate flex flex-col overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-card transition duration-500 ease-out',
        'hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--tone)_35%,transparent)] hover:shadow-[0_24px_48px_-20px_color-mix(in_srgb,var(--tone)_45%,transparent)]',
        'focus-visible:-translate-y-1.5',
        className,
      )}
      style={{ ...style, ['--tone' as string]: category.tone }}
    >
      {/* spotlight that follows the cursor */}
      <span
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(360px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--tone) 11%, transparent), transparent 65%)' }}
        aria-hidden
      />
      {/* dotted texture fading in */}
      <span className="bg-dots pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 [mask-image:linear-gradient(to_bottom,transparent,black)] group-hover:opacity-30" aria-hidden />
      {/* oversized watermark icon */}
      <Icon
        className="pointer-events-none absolute -right-6 -bottom-6 -z-10 size-36 translate-x-4 translate-y-4 rotate-12 opacity-0 transition duration-700 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0 group-hover:opacity-[0.07]"
        style={{ color: category.tone }}
        strokeWidth={1.25}
        aria-hidden
      />

      <div className="relative flex items-start justify-between">
        <span
          className="relative grid size-12 place-items-center overflow-hidden rounded-2xl transition duration-500 ease-out group-hover:-rotate-6 group-hover:scale-110 group-hover:text-white"
          style={{ background: `color-mix(in srgb, ${category.tone} 12%, white)`, color: category.tone }}
        >
          {/* tone fill rising from the bottom */}
          <span className="absolute inset-0 translate-y-full bg-[var(--tone)] transition-transform duration-500 ease-out group-hover:translate-y-0" aria-hidden />
          <Icon className="relative size-6 transition-colors duration-300 group-hover:text-white" aria-hidden />
        </span>
        <span className="rounded-full border border-line bg-white/80 px-2.5 py-1 text-xs font-medium text-muted transition duration-300 group-hover:border-[color-mix(in_srgb,var(--tone)_30%,transparent)] group-hover:text-[var(--tone)]">
          {count} {count === 1 ? 'e-book' : 'e-books'}
        </span>
      </div>

      <h3 className="relative mt-6 font-display text-lg font-bold tracking-wide uppercase transition-[letter-spacing] duration-500 group-hover:tracking-[0.06em]">{category.name}</h3>
      {!compact && <p className="relative mt-2 text-sm leading-relaxed text-muted transition-colors duration-300 group-hover:text-ink-2">{category.description}</p>}

      <span className="relative mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-ink transition-colors duration-300 group-hover:text-[var(--tone)]">
        <span className="relative">
          Explore Category
          <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-500 ease-out group-hover:scale-x-100" aria-hidden />
        </span>
        <span className="grid size-6 place-items-center rounded-full transition duration-500 group-hover:translate-x-1 group-hover:bg-[var(--tone)] group-hover:text-white">
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </span>

      {/* tone bar sweeping across the bottom edge */}
      <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[var(--tone)] transition-transform duration-500 ease-out group-hover:scale-x-100" aria-hidden />
    </Link>
  )
}
