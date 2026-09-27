/**
 * Generates backend/database/seed.sql (categories, authors, books) from the
 * frontend's catalogue files, so the database starts identical to the site.
 *
 *   npm run db:seed-sql
 *
 * Ratings, review counts and sales start at zero — they are calculated from
 * real reviews and purchases once the site is live.
 */
import { writeFileSync } from 'node:fs'
import { categories } from '../../src/data/categories.ts'
import { authors } from '../../src/data/authors.ts'
import { initialEbooks } from '../../src/data/ebooks.ts'

type V = string | number | null | undefined | object
const q = (v: V): string => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  const s = typeof v === 'object' ? JSON.stringify(v) : v
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}
const row = (values: V[]) => `  (${values.map(q).join(', ')})`

const catRows = categories.map((c, i) => row([c.slug, c.name, c.description, c.tone, (i + 1) * 10]))
const authorRows = authors.map((a) => row([a.id, a.name, a.specialization, a.bio, a.city, a.tone]))

const catSlug = (name: string) => categories.find((c) => c.name === name)!.slug
const bookRows = initialEbooks.map((b) => {
  const format = b.format === 'EPUB' ? 'epub' : 'pdf'
  return `  (${[
    q(b.id),
    q(b.title),
    q(b.subtitle ?? null),
    `(SELECT id FROM authors WHERE slug = ${q(b.authorId)})`,
    `(SELECT id FROM categories WHERE slug = ${q(catSlug(b.category))})`,
    q(b.description),
    q(b.longDescription),
    q(b.pages),
    q(b.language),
    q(format),
    q(b.isbn),
    q(b.publishedAt),
    q(b.level),
    q(b.price * 100),
    q(b.price === 0 ? 1 : 0),
    q(b.status),
    q(b.available ? 1 : 0),
    q(b.featured ? 1 : 0),
    q(b.cover),
    q(`${b.id}.${format}`),
    q(b.tags),
    q(b.learn),
    q(b.requirements ?? null),
  ].join(', ')})`
})

const sql = `-- =====================================================================
--  Bookera — starter catalogue (generated ${new Date().toISOString().slice(0, 10)} by npm run db:seed-sql)
--  Import AFTER schema.sql.  Contains: ${categories.length} categories, ${authors.length} authors, ${initialEbooks.length} books.
--  The demo books are placeholders — replace them with your real titles from the admin panel.
--  file_path is the expected file name inside storage/books/ (upload the PDF/EPUB there).
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
START TRANSACTION;

INSERT INTO categories (slug, name, description, tone, sort_order) VALUES
${catRows.join(',\n')};

INSERT INTO authors (slug, name, specialization, bio, city, tone) VALUES
${authorRows.join(',\n')};

INSERT INTO books (slug, title, subtitle, author_id, category_id, short_description, description, pages, language, format,
                   isbn, published_on, level, price_paise, is_free, status, is_enabled, is_featured, cover_design,
                   file_path, tags, learn, requirements) VALUES
${bookRows.join(',\n')};

COMMIT;
`
writeFileSync(new URL('../database/seed.sql', import.meta.url), sql)
console.log(`Wrote backend/database/seed.sql — ${categories.length} categories, ${authors.length} authors, ${initialEbooks.length} books`)
