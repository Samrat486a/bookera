import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import { cx } from '../../lib/format'

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'light' | 'saffron'
type Size = 'sm' | 'md' | 'lg'

const base =
  'group/btn relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full font-sans font-semibold whitespace-nowrap transition duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-offset-3'

/** Diagonal light sweep that glides across solid buttons on hover. */
const shine =
  "before:pointer-events-none before:absolute before:inset-y-0 before:-left-[60%] before:-z-10 before:w-[45%] before:-skew-x-[20deg] before:bg-linear-to-r before:from-transparent before:via-white/35 before:to-transparent before:opacity-0 before:transition-[translate,opacity] before:duration-700 before:ease-out hover:before:translate-x-[380%] hover:before:opacity-100"

const variants: Record<Variant, string> = {
  primary: `bg-indigo text-white shadow-[0_6px_18px_-8px_rgb(54_84_255/0.8)] hover:bg-indigo-600 hover:shadow-[0_14px_30px_-10px_rgb(54_84_255/0.75)] ${shine}`,
  dark: `bg-ink text-paper hover:bg-ink-2 hover:shadow-[0_14px_28px_-12px_rgb(20_23_27/0.55)] ${shine}`,
  outline: 'border border-line-2 bg-white/70 text-ink hover:border-ink/40 hover:bg-white hover:shadow-[0_10px_24px_-12px_rgb(20_23_27/0.28)]',
  ghost: 'text-ink hover:bg-ink/5',
  danger: `bg-coral text-white hover:bg-coral-700 hover:shadow-[0_12px_26px_-12px_rgb(255_93_93/0.8)] ${shine}`,
  light: `bg-white text-ink hover:bg-paper hover:shadow-[0_14px_28px_-12px_rgb(20_23_27/0.45)] ${shine.replaceAll('via-white/35', 'via-indigo/15')}`,
  saffron: `bg-saffron text-ink hover:brightness-95 hover:shadow-[0_12px_26px_-12px_rgb(255_174_31/0.9)] ${shine}`,
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px]',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cx(base, variants[variant], sizes[size], className)

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  )
})

type ButtonLinkProps = CommonProps & LinkProps

export function ButtonLink({ variant, size, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  )
}
