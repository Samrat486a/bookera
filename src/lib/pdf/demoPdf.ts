import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { Ebook } from '../../types'

/**
 * Builds a small, nicely typeset sample edition of a book in the browser.
 * Used only in demo mode — in live mode the real PDF is streamed from the server.
 */

const W = 432 // 6in
const H = 648 // 9in
const M = 54 // margin

const hex = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

// Standard PDF fonts only cover WinAnsi — normalise anything outside it.
const clean = (s: string) =>
  s
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E -ÿ–—‘’“”…•]/g, '')

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = clean(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(test, size) > width && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

const fillerSentences = [
  'Every idea in this chapter builds on the one before it, so take a moment to pause and connect it with something you already know.',
  'The best way to remember what you read is to explain it to someone else — even if that someone is a notebook.',
  'Notice how small, consistent choices compound over time into results that once felt out of reach.',
  'We will return to this example later, adding one new layer at a time until the whole picture comes together.',
  'Try the short exercise at the end of this section before moving on; it takes only a few minutes and makes the next part far easier.',
  'Good work rarely comes from a single flash of brilliance. It grows from patient curiosity and a willingness to begin again.',
  'Keep a list of the questions this chapter raises for you. Many of them will be answered in the pages ahead.',
  'As you read, underline the sentences that surprise you. Surprise is often the first sign that you are learning something new.',
  'There is no single right path here — only a set of principles you can adapt to your own goals and circumstances.',
  'By the end of this section you will be able to recognise the pattern quickly, and apply it with confidence.',
]

function paragraphs(book: Ebook, seed: number, count: number) {
  const base = [book.longDescription, book.description]
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const a = fillerSentences[(seed + i) % fillerSentences.length]!
    const b = fillerSentences[(seed + i * 3 + 1) % fillerSentences.length]!
    const c = fillerSentences[(seed + i * 7 + 2) % fillerSentences.length]!
    out.push(i === 0 && seed % 2 === 0 ? `${base[0]} ${a}` : `${a} ${b} ${c}`)
  }
  return out
}

export async function generateDemoPdf(book: Ebook, authorName: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(book.title)
  doc.setAuthor(authorName)
  doc.setCreator('Bookera')
  doc.setSubject(book.description)

  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic)
  const sans = await doc.embedFont(StandardFonts.Helvetica)
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const ink = hex('#14171B')
  const muted = hex('#6B7079')
  const accent = hex(book.cover.accent === '#F6F4EE' || book.cover.accent === '#FFFFFF' ? '#3654FF' : book.cover.accent)
  let pageNo = 0

  const newPage = (running = true) => {
    const p = doc.addPage([W, H])
    pageNo++
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hex('#FFFDF8') })
    if (running) {
      p.drawText(clean(book.title).toUpperCase(), { x: M, y: H - 34, size: 7, font: sans, color: muted })
      p.drawLine({ start: { x: M, y: H - 40 }, end: { x: W - M, y: H - 40 }, thickness: 0.4, color: hex('#E4E0D5') })
      const n = String(pageNo)
      p.drawText(n, { x: W / 2 - sans.widthOfTextAtSize(n, 8) / 2, y: 30, size: 8, font: sans, color: muted })
    }
    return p
  }

  const drawLines = (p: PDFPage, lines: string[], y: number, font: PDFFont, size: number, lead: number, color = ink) => {
    for (const l of lines) {
      p.drawText(l, { x: M, y, size, font, color })
      y -= lead
    }
    return y
  }

  /* Cover */
  const cover = doc.addPage([W, H])
  pageNo++
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hex(book.cover.bg) })
  cover.drawCircle({ x: W - 90, y: 170, size: 120, color: hex(book.cover.accent), opacity: 0.9 })
  cover.drawCircle({ x: W - 90, y: 170, size: 160, borderColor: hex(book.cover.fg), borderWidth: 1, opacity: 0, borderOpacity: 0.35 })
  const fg = hex(book.cover.fg)
  cover.drawText(clean(book.category).toUpperCase(), { x: M, y: H - 70, size: 9, font: sansBold, color: fg, opacity: 0.8 })
  let cy = drawLines(cover, wrap(book.title, sansBold, 34, W - M * 2), H - 130, sansBold, 34, 38, fg)
  if (book.subtitle) cy = drawLines(cover, wrap(book.subtitle, sans, 14, W - M * 2), cy - 8, sans, 14, 18, fg)
  cover.drawText(clean(authorName).toUpperCase(), { x: M, y: 70, size: 11, font: sansBold, color: fg })
  cover.drawText('BOOKERA EDITION', { x: M, y: 52, size: 7, font: sans, color: fg, opacity: 0.7 })

  /* Title / copyright page */
  const info = newPage(false)
  let y = drawLines(info, wrap(book.title, sansBold, 22, W - M * 2), H - 150, sansBold, 22, 27)
  y = drawLines(info, [`by ${clean(authorName)}`], y - 6, serifItalic, 13, 18, muted)
  drawLines(
    info,
    [
      `Published ${book.publishedAt} · ${book.pages} pages · ${book.language}`,
      `ISBN ${book.isbn}`,
      '',
      'Sample edition generated for the Bookera demo.',
      'Your purchased e-books are delivered as the publisher’s original PDF.',
    ],
    140,
    sans,
    8,
    13,
    muted,
  )

  /* Contents */
  const fallback = ['Beginnings', 'The First Step', 'Turning Points', 'Going Deeper', 'Bringing It Together']
  const chapters = [...book.learn, ...fallback].slice(0, Math.max(4, Math.min(book.learn.length, 6)))
  const contents = newPage()
  contents.drawText('Contents', { x: M, y: H - 110, size: 24, font: sansBold, color: ink })
  let cyy = H - 160
  chapters.forEach((c, i) => {
    const pageRef = String(4 + i * 2)
    contents.drawText(`${String(i + 1).padStart(2, '0')}`, { x: M, y: cyy, size: 10, font: sansBold, color: accent })
    const lines = wrap(c, serif, 12, W - M * 2 - 60)
    lines.forEach((l, j) => contents.drawText(l, { x: M + 30, y: cyy - j * 15, size: 12, font: serif, color: ink }))
    contents.drawText(pageRef, { x: W - M - sans.widthOfTextAtSize(pageRef, 10), y: cyy, size: 10, font: sans, color: muted })
    cyy -= 26 + (lines.length - 1) * 15
  })

  /* Chapters: opener page + continuation page */
  chapters.forEach((title, i) => {
    const open = newPage()
    open.drawText(`CHAPTER ${i + 1}`, { x: M, y: H - 120, size: 9, font: sansBold, color: accent })
    let yy = drawLines(open, wrap(title, sansBold, 20, W - M * 2), H - 146, sansBold, 20, 25)
    open.drawLine({ start: { x: M, y: yy - 4 }, end: { x: M + 40, y: yy - 4 }, thickness: 2, color: accent })
    yy -= 30
    for (const para of paragraphs(book, i * 2, 3)) {
      const lines = wrap(para, serif, 11.5, W - M * 2)
      if (yy - lines.length * 16 < 60) break
      yy = drawLines(open, lines, yy, serif, 11.5, 16) - 10
    }

    const cont = newPage()
    let y2 = H - 80
    for (const para of paragraphs(book, i * 2 + 1, 6)) {
      const lines = wrap(para, serif, 11.5, W - M * 2)
      if (y2 - lines.length * 16 < 60) break
      y2 = drawLines(cont, lines, y2, serif, 11.5, 16) - 10
    }
  })

  /* Closing */
  const end = newPage()
  end.drawText('Thank you for reading.', { x: M, y: H / 2 + 20, size: 22, font: sansBold, color: ink })
  drawLines(end, wrap('Find your next great read at bookera — your digital library for stories, ideas, and knowledge.', serifItalic, 12, W - M * 2), H / 2 - 10, serifItalic, 12, 17, muted)

  return doc.save()
}
