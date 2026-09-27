import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '../../lib/format'

const control =
  'w-full rounded-xl border bg-white px-4 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-indigo focus:ring-4 focus:ring-indigo/12 focus:outline-none disabled:bg-paper-2'

const controlState = (error?: string) =>
  error ? 'border-coral focus:border-coral focus:ring-coral/15' : 'border-line-2 hover:border-ink/30 hover:shadow-[0_8px_20px_-14px_rgb(20_23_27/0.35)]'

interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  id: string
  className?: string
  children: ReactNode
}

function FieldShell({ label, hint, error, required, id, className, children }: FieldShellProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-coral" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-[13px] font-medium text-coral-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type Common = { label?: string; hint?: string; error?: string; wrapperClassName?: string; icon?: ReactNode }

export const Input = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement>>(function Input(
  { label, hint, error, wrapperClassName, className, id, required, icon, ...rest },
  ref,
) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={fid} className={wrapperClassName}>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">{icon}</span>}
        <input
          ref={ref}
          id={fid}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${fid}-msg` : undefined}
          className={cx(control, controlState(error), 'h-12', !!icon && 'pl-11', className)}
          {...rest}
        />
      </div>
    </FieldShell>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, Common & TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { label, hint, error, wrapperClassName, className, id, required, ...rest },
  ref,
) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={fid} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={fid}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${fid}-msg` : undefined}
        className={cx(control, controlState(error), 'min-h-28 resize-y py-3 leading-relaxed', className)}
        {...rest}
      />
    </FieldShell>
  )
})

export const Select = forwardRef<HTMLSelectElement, Common & SelectHTMLAttributes<HTMLSelectElement> & { options: Array<string | { value: string; label: string }> }>(
  function Select({ label, hint, error, wrapperClassName, className, id, required, options, ...rest }, ref) {
    const autoId = useId()
    const fid = id ?? autoId
    return (
      <FieldShell label={label} hint={hint} error={error} required={required} id={fid} className={wrapperClassName}>
        <div className="relative">
          <select
            ref={ref}
            id={fid}
            required={required}
            aria-invalid={!!error || undefined}
            className={cx(control, controlState(error), 'h-12 appearance-none pr-10', className)}
            {...rest}
          >
            {options.map((o) => {
              const opt = typeof o === 'string' ? { value: o, label: o } : o
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              )
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
        </div>
      </FieldShell>
    )
  },
)
