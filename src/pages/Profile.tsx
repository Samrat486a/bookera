import { useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, Loader2, Lock, Mail, Phone, RotateCcw, UserRound } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useToast } from '../context/ToastContext'
import { categories } from '../data/categories'
import { cx } from '../lib/format'
import { API_MODE } from '../lib/api'
import { EMAIL_RE, fieldErrors, isValidPhone } from '../lib/checkout'
import { PageHeader, RequireRole } from '../components/layout/Layouts'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Field'
import { Avatar } from '../components/ui/States'
import { ConfirmModal } from '../components/ui/Modal'
import { Spotlight, trackSpotlight } from '../components/ui/Spotlight'

function ProfileForm({ inAdmin }: { inAdmin?: boolean }) {
  const { user, updateProfile, changePassword, resetDemo } = useStore()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [interests, setInterests] = useState<string[]>(user?.readingInterests ?? [])
  const [currentPassword, setCurrentPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [pwSaving, setPwSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  if (!user) return null

  const emailChanged = email.trim().toLowerCase() !== user.email

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (name.trim().length < 2) errs.name = 'Please enter your full name.'
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Please enter a valid email address.'
    if (phone.trim() && !isValidPhone(phone)) errs.phone = 'Please enter a valid phone number (10–15 digits).'
    if (emailChanged && !currentPassword) errs.currentPassword = 'Enter your current password to change your email.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        readingInterests: interests,
        ...(emailChanged ? { email: email.trim(), currentPassword } : {}),
      })
      setCurrentPassword('')
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' })
    } catch (err) {
      setErrors(fieldErrors(err) ?? { name: err instanceof Error ? err.message : 'Couldn’t save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!pw.current) errs.currentPassword = 'Enter your current password.'
    if (pw.next.length < 8) errs.newPassword = 'Use at least 8 characters.'
    if (!pw.confirm || pw.confirm !== pw.next) errs.confirm = 'Passwords don’t match.'
    setPwErrors(errs)
    if (Object.keys(errs).length) return
    setPwSaving(true)
    try {
      await changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      toast({ title: 'Password changed', description: 'Other devices have been signed out.' })
    } catch (err) {
      setPwErrors(fieldErrors(err) ?? { currentPassword: err instanceof Error ? err.message : 'Please try again.' })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className={cx('mx-auto', inAdmin ? 'max-w-4xl' : 'container-page max-w-4xl py-10 sm:py-14')}>
      <PageHeader eyebrow="Account" title="Profile" description="Manage how you appear on Bookera." />

      <div onMouseMove={trackSpotlight} className="group relative isolate overflow-hidden rounded-3xl border border-line bg-white shadow-card transition duration-500 ease-out hover:-translate-y-1 hover:border-indigo/25 hover:shadow-[0_26px_50px_-26px_rgb(54_84_255/0.45)] mt-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Spotlight size={420} strength={9} />
        <span className="pointer-events-none absolute -top-24 -right-24 -z-10 size-64 rounded-full bg-indigo/0 blur-3xl transition duration-700 group-hover:bg-indigo/15" aria-hidden />
        <div className="relative w-fit">
          <span className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_0deg,#3654FF,#FFAE1F,#FF5D5D,#3654FF)] opacity-0 blur-[1px] transition duration-500 group-hover:animate-spin-slow group-hover:opacity-100" aria-hidden />
          <span className="absolute -inset-0.5 rounded-full bg-white" aria-hidden />
          <Avatar name={user.name} tone={user.role === 'admin' ? '#FFAE1F' : '#3654FF'} size="lg" className="relative transition duration-500 group-hover:scale-105" />
        </div>
        <div className="min-w-0 flex-1 transition-transform duration-500 ease-out group-hover:translate-x-1">
          <p className="truncate font-display text-2xl font-bold">{user.name}</p>
          <p className="truncate text-muted">{user.email}</p>
        </div>
        <Badge tone={user.role === 'admin' ? 'saffron' : 'indigo'}>{user.role === 'admin' ? 'Admin' : 'Reader'}</Badge>
      </div>

      <form onSubmit={save} className="mt-6 space-y-6">
        <fieldset onMouseMove={trackSpotlight} className="group relative isolate overflow-hidden rounded-3xl border border-line bg-white shadow-card transition duration-500 ease-out hover:-translate-y-1 hover:border-indigo/25 hover:shadow-[0_26px_50px_-26px_rgb(54_84_255/0.45)] grid gap-5 p-6 sm:grid-cols-2">
          <legend className="sr-only">Personal details</legend>
          <Spotlight size={460} strength={7} />
          <Input label="Full Name" autoComplete="name" icon={<UserRound className="size-4" />} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <Input label="Phone Number" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" icon={<Phone className="size-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
          <Input label="Email" type="email" autoComplete="email" icon={<Mail className="size-4" />} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} wrapperClassName={emailChanged ? '' : 'sm:col-span-2'} />
          {emailChanged && (
            <Input
              label="Current Password"
              type="password"
              autoComplete="current-password"
              icon={<Lock className="size-4" />}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={errors.currentPassword}
              hint="Needed to confirm an email change."
              wrapperClassName="animate-fade-up"
            />
          )}
          <Textarea label="About you" wrapperClassName="sm:col-span-2" maxLength={500} placeholder="A sentence or two about what you love to read." value={bio} onChange={(e) => setBio(e.target.value)} error={errors.bio} hint={`${bio.length}/500`} />
        </fieldset>

        <fieldset onMouseMove={trackSpotlight} className="group relative isolate overflow-hidden rounded-3xl border border-line bg-white shadow-card transition duration-500 ease-out hover:-translate-y-1 hover:border-indigo/25 hover:shadow-[0_26px_50px_-26px_rgb(54_84_255/0.45)] p-6">
          <legend className="sr-only">Reading interests</legend>
          <Spotlight color="#FFAE1F" size={460} strength={10} />
          <h2 className="font-display text-lg font-bold" aria-hidden>
            Reading interests
          </h2>
          <p className="text-sm text-muted">We’ll use these to personalise recommendations.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = interests.includes(c.name)
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setInterests((prev) => (prev.includes(c.name) ? prev.filter((i) => i !== c.name) : [...prev, c.name]))}
                  className={cx(
                    'h-10 rounded-full px-4 text-sm font-medium transition duration-300 ease-out hover:-translate-y-0.5 active:scale-95',
                    on
                      ? 'bg-ink text-paper shadow-[0_8px_18px_-10px_rgb(20_23_27/0.7)]'
                      : 'border border-line bg-white text-ink-2 hover:border-ink/25 hover:text-ink hover:shadow-[0_10px_20px_-14px_rgb(20_23_27/0.45)]',
                  )}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {API_MODE === 'mock' ? (
            <Button variant="ghost" onClick={() => setResetOpen(true)} className="text-muted">
              <RotateCcw className="size-4" aria-hidden /> Reset demo data
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <form onSubmit={savePassword} noValidate className="mt-6">
        <fieldset onMouseMove={trackSpotlight} className="group relative isolate overflow-hidden rounded-3xl border border-line bg-white shadow-card transition duration-500 ease-out hover:-translate-y-1 hover:border-indigo/25 hover:shadow-[0_26px_50px_-26px_rgb(54_84_255/0.45)] grid gap-5 p-6 sm:grid-cols-3">
          <legend className="sr-only">Change password</legend>
          <Spotlight color="#FF5D5D" size={460} strength={8} />
          <div className="sm:col-span-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold" aria-hidden>
              <KeyRound className="size-4 text-coral" /> Change password
            </h2>
            <p className="text-sm text-muted">You’ll stay signed in here; other devices will be signed out.</p>
          </div>
          <Input label="Current Password" type="password" icon={<Lock className="size-4" />} autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwErrors.currentPassword} />
          <Input label="New Password" type="password" icon={<Lock className="size-4" />} autoComplete="new-password" placeholder="At least 8 characters" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwErrors.newPassword} />
          <Input label="Confirm New Password" type="password" icon={<Lock className="size-4" />} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErrors.confirm} />
          <div className="flex justify-end sm:col-span-3">
            <Button type="submit" variant="dark" disabled={pwSaving}>
              {pwSaving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {pwSaving ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </fieldset>
      </form>

      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        tone="dark"
        title="Reset demo data?"
        description="Restores the sample catalogue and library. Books you added or edited in this demo will be cleared."
        confirmLabel="Reset"
        onConfirm={() => {
          resetDemo()
          toast({ title: 'Demo data restored', tone: 'info' })
        }}
      />
    </div>
  )
}

export default function Profile({ inAdmin }: { inAdmin?: boolean }) {
  return inAdmin ? (
    <ProfileForm inAdmin />
  ) : (
    <RequireRole role="any">
      <ProfileForm />
    </RequireRole>
  )
}
