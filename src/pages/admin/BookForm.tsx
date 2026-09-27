import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, FileText, ImagePlus, Loader2, Plus, UploadCloud, X } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { useToast } from '../../context/ToastContext'
import { authors, getAuthor } from '../../data/authors'
import { categories } from '../../data/categories'
import type { BookInput } from '../../lib/api'
import { fieldErrors } from '../../lib/checkout'
import { cx, todayISO } from '../../lib/format'
import type { CoverDesign, CoverPattern, Ebook, ReadingLevel } from '../../types'
import { PageHeader } from '../../components/layout/Layouts'
import { BookCover } from '../../components/ebooks/BookCover'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/States'

const palettes: Array<Omit<CoverDesign, 'pattern'>> = [
  { bg: '#14171B', fg: '#F6F4EE', accent: '#FFAE1F' },
  { bg: '#3654FF', fg: '#FFFFFF', accent: '#FFAE1F' },
  { bg: '#FFAE1F', fg: '#14171B', accent: '#FF5D5D' },
  { bg: '#FF5D5D', fg: '#FFFFFF', accent: '#14171B' },
  { bg: '#F6F4EE', fg: '#14171B', accent: '#3654FF' },
  { bg: '#1F8A5B', fg: '#FFFFFF', accent: '#FFAE1F' },
  { bg: '#0E7C7B', fg: '#F6F4EE', accent: '#FFAE1F' },
]
const patterns: CoverPattern[] = ['grid', 'rings', 'stripes', 'code', 'wave', 'blocks', 'orbit', 'arch', 'dots', 'sun']
const levels: ReadingLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'All levels']
const COVER_MAX = 5 * 1024 * 1024
const EBOOK_MAX = 100 * 1024 * 1024

interface FormState {
  title: string
  category: string
  format: 'PDF' | 'EPUB'
  publishedAt: string
  publisher: string
  language: string
  pages: string
  author: string
  authorBio: string
  description: string
  longDescription: string
  price: string
  tags: string[]
  isbn: string
  level: ReadingLevel
  learn: string[]
  cover: CoverDesign
  available: boolean
  featured: boolean
}

const fromBook = (b?: Ebook): FormState => {
  const a = b ? getAuthor(b.authorId) : undefined
  return {
    title: b?.title ?? '',
    category: b?.category ?? categories[0]?.name ?? 'Programming',
    format: b?.format === 'EPUB' ? 'EPUB' : 'PDF',
    publishedAt: b?.publishedAt ?? todayISO(),
    publisher: b?.publisher ?? '',
    language: b?.language ?? 'English',
    pages: b ? String(b.pages) : '',
    author: b?.authorName ?? a?.name ?? '',
    authorBio: b?.authorBio ?? a?.bio ?? '',
    description: b?.description ?? '',
    longDescription: b?.longDescription ?? '',
    price: b ? String(b.price) : '0',
    tags: b?.tags ?? [],
    isbn: b?.isbn && b.isbn !== '—' ? b.isbn : '',
    level: b?.level ?? 'All levels',
    learn: b?.learn.length ? b.learn : [''],
    cover: b?.cover ?? { ...palettes[1]!, pattern: 'orbit' },
    available: b?.available ?? true,
    featured: b?.featured ?? false,
  }
}

const formatBytes = (n?: number | null) => (!n ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

// server field → form field id (bf-…)
const FIELD_MAP: Record<string, string> = { longDescription: 'description' }

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7">
      <legend className="sr-only">{title}</legend>
      <h2 className="font-display text-lg font-bold" aria-hidden>
        {title}
      </h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-paper/60 p-4 transition hover:border-line-2">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={cx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-indigo', checked ? 'bg-indigo' : 'bg-line-2')} aria-hidden>
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  )
}

export default function BookForm() {
  const { id } = useParams()
  const { getBook, createBook, editBook, setBookStatus, uploadCover, uploadBookFile, catalogReady } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const existing = id ? getBook(id) : undefined
  const isEdit = !!id
  const [form, setForm] = useState<FormState>(() => fromBook(existing))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState<null | 'publish' | 'draft'>(null)
  const [stage, setStage] = useState<{ label: string; pct?: number } | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [ebookFile, setEbookFile] = useState<File | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const ebookRef = useRef<HTMLInputElement>(null)
  const loadedFor = useRef<string | undefined>(existing?.id)

  // The live catalogue may finish loading after this page opens.
  useEffect(() => {
    if (existing && loadedFor.current !== existing.id) {
      loadedFor.current = existing.id
      setForm(fromBook(existing))
    }
  }, [existing])

  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : undefined), [coverFile])
  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    },
    [coverPreview],
  )

  if (isEdit && !existing) {
    if (!catalogReady) {
      return (
        <div className="grid min-h-[40vh] place-items-center text-sm text-muted" role="status">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </div>
      )
    }
    return <EmptyState title="E-book not found" description="It may have been deleted." action={<ButtonLink to="/admin/books">Back to E-books</ButtonLink>} />
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(({ [k]: _removed, ...rest }) => rest)
  }
  const knownAuthor = authors.find((a) => a.name.toLowerCase() === form.author.trim().toLowerCase())

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.title.trim().length < 2) e.title = 'Title must be at least 2 characters.'
    if (form.author.trim().length < 2) e.author = 'Enter the author’s name.'
    if (!Number(form.pages) || Number(form.pages) < 1) e.pages = 'Enter the number of pages.'
    if (form.price === '' || Number(form.price) < 0 || Number.isNaN(Number(form.price))) e.price = 'Price can’t be negative.'
    if (form.description.trim().length < 20) e.description = 'Write at least 20 characters.'
    if (form.isbn && !/^[\d\sXx-]{10,17}$/.test(form.isbn)) e.isbn = 'Use digits and hyphens only (e.g. 978-1-23456-789-0).'
    setErrors(e)
    const first = Object.keys(e)[0]
    if (first) document.getElementById(`bf-${first}`)?.focus()
    return !first
  }

  const toInput = (status: Ebook['status']): BookInput => ({
    title: form.title.trim(),
    category: form.category,
    author: form.author.trim(),
    authorBio: form.authorBio.trim(),
    description: form.description.trim(),
    longDescription: form.longDescription.trim(),
    pages: Number(form.pages),
    format: form.format,
    language: form.language,
    level: form.level,
    publishedAt: form.publishedAt,
    publisher: form.publisher.trim(),
    price: Number(form.price) || 0,
    isbn: form.isbn.trim(),
    tags: form.tags,
    learn: form.learn.map((l) => l.trim()).filter(Boolean),
    requirements: existing?.requirements ?? [],
    cover: form.cover,
    status,
    available: form.available,
    featured: form.featured,
  })

  const uploadFiles = async (book: Ebook) => {
    let b = book
    if (coverFile) {
      setStage({ label: 'Uploading cover', pct: 0 })
      b = await uploadCover(b, coverFile, (pct) => setStage({ label: 'Uploading cover', pct }))
    }
    if (ebookFile) {
      setStage({ label: 'Uploading e-book file', pct: 0 })
      b = await uploadBookFile(b, ebookFile, (pct) => setStage({ label: 'Uploading e-book file', pct }))
    }
    return b
  }

  const submit = (mode: 'publish' | 'draft') => async (e?: FormEvent) => {
    e?.preventDefault()
    if (!validate()) {
      toast({ title: 'Please fix the highlighted fields', tone: 'error' })
      return
    }
    setSaving(mode)
    let saved: Ebook | undefined
    try {
      if (isEdit && existing) {
        // Files first, so a book that's already published keeps its file requirement satisfied.
        saved = await uploadFiles(existing)
        setStage({ label: 'Saving details' })
        const status = mode === 'draft' ? 'draft' : existing.status
        saved = await editBook(saved, toInput(status))
        toast({ title: 'E-book updated successfully.' })
      } else {
        setStage({ label: 'Saving details' })
        saved = await createBook(toInput('draft'))
        saved = await uploadFiles(saved)
        if (mode === 'publish') {
          setStage({ label: 'Publishing' })
          saved = await setBookStatus(saved, { status: 'published' })
          toast({ title: 'E-book published 🎉', description: `“${saved.title}” is now live for readers.` })
        } else {
          toast({ title: 'Draft saved', description: `“${saved.title}” was saved to your drafts.` })
        }
      }
      navigate('/admin/books')
    } catch (err) {
      const fields = fieldErrors(err, FIELD_MAP)
      if (fields) setErrors((prev) => ({ ...prev, ...fields }))
      const code = (err as { code?: string }).code
      toast({
        title: code === 'FILE_REQUIRED' ? 'E-book file needed' : 'Couldn’t save',
        description: err instanceof Error ? err.message : 'Please try again.',
        tone: 'error',
      })
      // A new book may already exist as a draft — continue editing it instead of creating a duplicate.
      if (!isEdit && saved) navigate(`/admin/books/${saved.id}/edit`, { replace: true })
    } finally {
      setSaving(null)
      setStage(null)
    }
  }

  const onCover = (file?: File) => {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast({ title: 'Please choose a JPG, PNG or WebP image', tone: 'error' })
    if (file.size > COVER_MAX) return toast({ title: 'Image too large', description: 'Please use an image under 5 MB.', tone: 'error' })
    setCoverFile(file)
  }
  const onEbook = (file?: File) => {
    if (!file) return
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext !== 'pdf' && ext !== 'epub') return toast({ title: 'Please choose a PDF or EPUB file', tone: 'error' })
    if (file.size > EBOOK_MAX) return toast({ title: 'File too large', description: 'E-book files must be under 100 MB.', tone: 'error' })
    setEbookFile(file)
    set('format', ext === 'epub' ? 'EPUB' : 'PDF')
    if (errors.file) setErrors(({ file: _f, ...rest }) => rest)
  }

  const addTag = () => {
    const t = tagInput.trim().replace(/,$/, '').toLowerCase()
    if (t && !form.tags.includes(t) && form.tags.length < 12) set('tags', [...form.tags, t])
    setTagInput('')
  }

  const hasFile = !!ebookFile || existing?.hasFile !== false
  const coverImage = coverPreview ?? existing?.coverImage

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={isEdit ? 'Edit e-book' : 'New e-book'}
        title={isEdit ? `Edit “${existing!.title}”` : 'Publish New E-book'}
        description={isEdit ? 'Update details, cover, and file. Changes go live immediately for published books.' : 'Fill in the details below. You can save a draft and publish later.'}
      />

      <form onSubmit={submit('publish')} noValidate className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Section title="Book Information" description="The essentials readers see first.">
            <Input id="bf-title" label="E-book Title" wrapperClassName="sm:col-span-2" placeholder="e.g. Modern JavaScript Development" value={form.title} onChange={(e) => set('title', e.target.value)} error={errors.title} required />
            <Select id="bf-category" label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} options={categories.map((c) => c.name)} error={errors.category} required />
            <Select label="Format" value={form.format} onChange={(e) => set('format', e.target.value as 'PDF' | 'EPUB')} options={['PDF', 'EPUB']} hint="Set automatically from the uploaded file." required />
            <Input id="bf-publishedAt" label="Publication Date" type="date" value={form.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} error={errors.publishedAt} required />
            <Input id="bf-publisher" label="Publisher" placeholder="e.g. Bookera Press" value={form.publisher} onChange={(e) => set('publisher', e.target.value)} />
            <Select label="Language" value={form.language} onChange={(e) => set('language', e.target.value)} options={['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Spanish', 'French', 'German']} />
            <Input id="bf-pages" label="Number of Pages" type="number" min={1} inputMode="numeric" placeholder="320" value={form.pages} onChange={(e) => set('pages', e.target.value)} error={errors.pages} required />
            <Select label="Reading Level" value={form.level} onChange={(e) => set('level', e.target.value as ReadingLevel)} options={levels} />
          </Section>

          <Section title="Author Information">
            <Input
              id="bf-author"
              label="Author Name"
              list="bf-author-list"
              placeholder="Start typing to pick an existing author"
              value={form.author}
              onChange={(e) => {
                const name = e.target.value
                const match = authors.find((a) => a.name.toLowerCase() === name.trim().toLowerCase())
                setForm((f) => ({ ...f, author: name, authorBio: match && !f.authorBio ? match.bio : f.authorBio }))
                if (errors.author) setErrors(({ author: _a, ...rest }) => rest)
              }}
              error={errors.author}
              hint={form.author.trim() && !knownAuthor ? 'New author — will be added to the catalogue.' : undefined}
              required
            />
            <datalist id="bf-author-list">
              {authors.map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
            <Input label="Specialization" value={knownAuthor?.specialization ?? ''} readOnly disabled hint="Managed on the author’s profile." />
            <Textarea id="bf-authorBio" label="Author Bio" wrapperClassName="sm:col-span-2" maxLength={500} value={form.authorBio} onChange={(e) => set('authorBio', e.target.value)} error={errors.authorBio} className="min-h-20" />
          </Section>

          <Section title="E-book File" description="The file buyers receive. Stored privately — never linked publicly.">
            <div className="sm:col-span-2">
              <div
                id="bf-file"
                className={cx(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition hover:border-indigo hover:bg-indigo-50/40',
                  errors.file ? 'border-coral bg-coral-50/40' : 'border-line-2 bg-paper/60',
                )}
                onClick={() => ebookRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  onEbook(e.dataTransfer.files[0])
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ebookRef.current?.click()}
                aria-label="Upload e-book file"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-white text-indigo shadow-card">
                  <UploadCloud className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold">
                  Drop a PDF or EPUB or <span className="text-indigo">browse</span>
                </p>
                <p className="text-xs text-muted">Max 100 MB</p>
                <input ref={ebookRef} type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" className="sr-only" onChange={(e) => onEbook(e.target.files?.[0])} tabIndex={-1} />
              </div>
              {ebookFile ? (
                <p className="mt-3 flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-indigo" aria-hidden />
                  <span className="font-medium">{ebookFile.name}</span>
                  <span className="text-muted">· {formatBytes(ebookFile.size)} · uploads when you save</span>
                  <button type="button" onClick={() => setEbookFile(null)} className="ml-auto inline-flex items-center gap-1 font-medium text-coral-700 hover:underline">
                    <X className="size-4" /> Remove
                  </button>
                </p>
              ) : existing?.hasFile ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-leaf">
                  <CheckCircle2 className="size-4" aria-hidden /> File on record{existing.fileSize ? ` · ${formatBytes(existing.fileSize)}` : ''} — upload a new one to replace it.
                </p>
              ) : (
                <p className={cx('mt-3 text-sm', errors.file ? 'font-medium text-coral-700' : 'text-muted')}>{errors.file ?? 'No file yet — required before the book can be published.'}</p>
              )}
            </div>
          </Section>

          <Section title="Book Cover" description="Upload artwork, or use a Bookera generated cover.">
            <div className="sm:col-span-2">
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-2 bg-paper/60 px-6 py-8 text-center transition hover:border-indigo hover:bg-indigo-50/40"
                onClick={() => coverRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  onCover(e.dataTransfer.files[0])
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && coverRef.current?.click()}
                aria-label="Upload cover image"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-white text-indigo shadow-card">
                  <ImagePlus className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold">
                  Drop an image or <span className="text-indigo">browse</span>
                </p>
                <p className="text-xs text-muted">JPG, PNG or WebP · 2:3 ratio recommended · max 5 MB</p>
                <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onCover(e.target.files?.[0])} tabIndex={-1} />
              </div>
              {errors.cover && <p className="mt-2 text-[13px] font-medium text-coral-700">{errors.cover}</p>}
              {coverFile && (
                <button type="button" onClick={() => setCoverFile(null)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-coral-700 hover:underline">
                  <X className="size-4" /> Remove selected image
                </button>
              )}
            </div>
            <div className={cx('sm:col-span-2', coverImage && 'pointer-events-none opacity-40')}>
              <p className="text-sm font-medium">Palette</p>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Cover palette">
                {palettes.map((p) => {
                  const active = p.bg === form.cover.bg && p.accent === form.cover.accent
                  return (
                    <button
                      key={p.bg + p.accent}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`Palette ${p.bg}`}
                      onClick={() => set('cover', { ...form.cover, ...p })}
                      className={cx('flex size-10 overflow-hidden rounded-full border-2 transition', active ? 'border-ink ring-2 ring-ink/10' : 'border-line')}
                    >
                      <span className="h-full w-2/3" style={{ background: p.bg }} />
                      <span className="h-full w-1/3" style={{ background: p.accent }} />
                    </button>
                  )
                })}
              </div>
              <p className="mt-5 text-sm font-medium">Motif</p>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Cover motif">
                {patterns.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={form.cover.pattern === p}
                    onClick={() => set('cover', { ...form.cover, pattern: p })}
                    className={cx('h-9 rounded-full px-3.5 text-sm font-medium capitalize transition', form.cover.pattern === p ? 'bg-ink text-paper' : 'border border-line bg-white text-ink-2 hover:border-line-2')}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Description">
            <Textarea id="bf-description" label="Short Description" wrapperClassName="sm:col-span-2" className="min-h-20" maxLength={255} hint={`${form.description.length}/255 · Shown on e-book cards`} value={form.description} onChange={(e) => set('description', e.target.value)} error={errors.description} required />
            <Textarea label="Full Description" wrapperClassName="sm:col-span-2" className="min-h-40" placeholder="What is this book about? Who is it for?" value={form.longDescription} onChange={(e) => set('longDescription', e.target.value)} />
          </Section>

          <Section title="Additional Details">
            <Input id="bf-price" label="Price (₹)" type="number" min={0} step="1" inputMode="numeric" hint="Set 0 to make it free." value={form.price} onChange={(e) => set('price', e.target.value)} error={errors.price} />
            <Input id="bf-isbn" label="ISBN" placeholder="978-1-23456-789-0" value={form.isbn} onChange={(e) => set('isbn', e.target.value)} error={errors.isbn} />
            <Toggle label="Available to buy" hint="Off shows “Currently unavailable” and blocks purchases." checked={form.available} onChange={(v) => set('available', v)} />
            <Toggle label="Featured" hint="Shown on the home page shelf." checked={form.featured} onChange={(v) => set('featured', v)} />
            <div className="sm:col-span-2">
              <Input
                label="Tags"
                placeholder="Type a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                onBlur={addTag}
                hint="Up to 12 tags help readers find your book."
              />
              {form.tags.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {form.tags.map((t) => (
                    <li key={t} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pr-1.5 pl-3 text-sm font-medium text-indigo-600">
                      #{t}
                      <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} className="grid size-5 place-items-center rounded-full hover:bg-indigo hover:text-white" aria-label={`Remove tag ${t}`}>
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium">What Readers Will Learn</p>
              <ul className="mt-2 space-y-2">
                {form.learn.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <Input
                      aria-label={`Learning outcome ${i + 1}`}
                      wrapperClassName="flex-1"
                      placeholder={`Outcome ${i + 1}`}
                      value={l}
                      onChange={(e) => set('learn', form.learn.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    <button
                      type="button"
                      onClick={() => set('learn', form.learn.length > 1 ? form.learn.filter((_, j) => j !== i) : [''])}
                      className="grid size-12 shrink-0 place-items-center rounded-xl border border-line-2 text-muted hover:border-coral hover:text-coral-700"
                      aria-label={`Remove outcome ${i + 1}`}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {form.learn.length < 12 && (
                <button type="button" onClick={() => set('learn', [...form.learn, ''])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo hover:underline">
                  <Plus className="size-4" /> Add outcome
                </button>
              )}
            </div>
          </Section>
        </div>

        {/* Live preview + actions */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-3xl border border-line bg-white p-5 shadow-card">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Live preview</p>
            <div className="mt-4 flex justify-center rounded-2xl p-6" style={{ background: `color-mix(in srgb, ${form.cover.bg} 12%, #F6F4EE)` }}>
              <BookCover title={form.title || 'Your title here'} author={form.author || undefined} category={form.category} cover={form.cover} image={coverImage} className="w-40" />
            </div>
            <p className={cx('mt-4 flex items-center gap-2 text-xs', hasFile ? 'text-leaf' : 'text-muted')}>
              {hasFile ? <CheckCircle2 className="size-3.5" aria-hidden /> : <FileText className="size-3.5" aria-hidden />}
              {hasFile ? 'E-book file ready' : 'Add the e-book file to publish'}
            </p>
            {stage && (
              <div className="mt-4 rounded-2xl bg-paper p-3" role="status" aria-live="polite">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> {stage.label}
                  {stage.pct !== undefined && <span className="ml-auto tabular-nums">{stage.pct}%</span>}
                </p>
                {stage.pct !== undefined && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-indigo transition-[width]" style={{ width: `${stage.pct}%` }} />
                  </div>
                )}
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2.5">
              {isEdit ? (
                <Button type="submit" disabled={!!saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              ) : (
                <>
                  <Button type="submit" disabled={!!saving}>
                    {saving === 'publish' ? 'Publishing…' : 'Publish E-book'}
                  </Button>
                  <Button variant="outline" onClick={() => submit('draft')()} disabled={!!saving}>
                    {saving === 'draft' ? 'Saving…' : 'Save Draft'}
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => navigate('/admin/books')} disabled={!!saving}>
                Cancel
              </Button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}
