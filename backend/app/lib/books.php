<?php
declare(strict_types=1);

/*
 * Catalogue helpers: database rows → the JSON shape the React app uses.
 *
 * The React app identifies books by slug (URLs like /ebooks/modern-javascript-development),
 * so `id` in API responses is the slug and `dbId` is the numeric primary key.
 */

const BOOK_SELECT = '
    SELECT b.*, a.slug AS author_slug, a.name AS author_name, a.bio AS author_bio,
           c.slug AS category_slug, c.name AS category_name
      FROM books b
      JOIN authors a    ON a.id = b.author_id
      JOIN categories c ON c.id = b.category_id';

function json_list($value): array
{
    $decoded = is_string($value) ? json_decode($value, true) : $value;
    return is_array($decoded) ? array_values($decoded) : [];
}

function public_cover_url(?string $path): ?string
{
    // Covers live in the public API folder: /api/uploads/covers/<file>
    return $path ? '/api/' . ltrim($path, '/') : null;
}

/** @param bool $admin include private fields (file info, timestamps) */
function book_to_api(array $b, bool $admin = false): array
{
    $format = $b['format'] === 'epub' ? 'EPUB' : 'PDF';
    $out = [
        'id'              => $b['slug'],
        'dbId'            => (int) $b['id'],
        'title'           => $b['title'],
        'subtitle'        => $b['subtitle'],
        'category'        => $b['category_name'],
        'categorySlug'    => $b['category_slug'],
        'authorId'        => $b['author_slug'],
        'authorName'      => $b['author_name'],
        'description'     => $b['short_description'],
        'longDescription' => $b['description'] ?? '',
        'pages'           => (int) ($b['pages'] ?? 0),
        'rating'          => (float) $b['rating_avg'],
        'reviews'         => (int) $b['rating_count'],
        'publishedAt'     => $b['published_on'] ?? substr((string) $b['created_at'], 0, 10),
        'format'          => $format,
        'language'        => $b['language'],
        'price'           => (int) $b['price_paise'] / 100,
        'featured'        => (bool) $b['is_featured'],
        'readers'         => (int) $b['sales_count'],
        'level'           => $b['level'],
        'isbn'            => $b['isbn'] ?? '',
        'publisher'       => $b['publisher'],
        'tags'            => json_list($b['tags']),
        'learn'           => json_list($b['learn']),
        'requirements'    => json_list($b['requirements']),
        'cover'           => json_decode((string) ($b['cover_design'] ?? ''), true) ?: ['bg' => '#14171B', 'fg' => '#F6F4EE', 'accent' => '#FFAE1F', 'pattern' => 'grid'],
        'coverImage'      => public_cover_url($b['cover_path']),
        'status'          => $b['status'],
        'available'       => (bool) $b['is_enabled'],
    ];
    if ($admin) {
        $out += [
            'authorBio' => $b['author_bio'],
            'hasFile'   => !empty($b['file_path']) && is_file(storage_path('books/' . basename((string) $b['file_path']))),
            'fileName'  => $b['file_path'] ? basename((string) $b['file_path']) : null,
            'fileSize'  => $b['file_size'] !== null ? (int) $b['file_size'] : null,
            'updatedAt' => $b['updated_at'],
        ];
    }
    return $out;
}

/** Published, not deleted — what visitors may see. */
function find_public_book(string $slugOrId): ?array
{
    $field = ctype_digit($slugOrId) ? 'b.id' : 'b.slug';
    $stmt = db()->prepare(BOOK_SELECT . " WHERE $field = ? AND b.status = 'published' AND b.deleted_at IS NULL");
    $stmt->execute([$slugOrId]);
    return $stmt->fetch() ?: null;
}

/** Any non-deleted book (admin). */
function find_book_admin(int $id): ?array
{
    $stmt = db()->prepare(BOOK_SELECT . ' WHERE b.id = ? AND b.deleted_at IS NULL');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function make_slug(string $text): string
{
    $slug = strtolower(trim((string) preg_replace('/[^A-Za-z0-9]+/', '-', @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: $text), '-'));
    return $slug !== '' ? substr($slug, 0, 140) : 'book';
}

/** Unique slug in a table (appends -2, -3… if needed). */
function unique_slug(string $table, string $base, ?int $exceptId = null): string
{
    $slug = $base;
    for ($i = 2; ; $i++) {
        $stmt = db()->prepare("SELECT id FROM $table WHERE slug = ?" . ($exceptId ? ' AND id <> ?' : ''));
        $stmt->execute($exceptId ? [$slug, $exceptId] : [$slug]);
        if (!$stmt->fetch()) {
            return $slug;
        }
        $slug = substr($base, 0, 134) . '-' . $i;
    }
}

/** Category by slug or exact name. */
function find_category(string $slugOrName): ?array
{
    $stmt = db()->prepare('SELECT * FROM categories WHERE slug = ? OR name = ? LIMIT 1');
    $stmt->execute([$slugOrName, $slugOrName]);
    return $stmt->fetch() ?: null;
}

/** Author by slug or name (case-insensitive); created if it doesn't exist yet. */
function find_or_create_author(string $slugOrName, ?string $bio = null): array
{
    $stmt = db()->prepare('SELECT * FROM authors WHERE slug = ? OR LOWER(name) = LOWER(?) LIMIT 1');
    $stmt->execute([$slugOrName, $slugOrName]);
    $author = $stmt->fetch();
    if (!$author) {
        $slug = unique_slug('authors', make_slug($slugOrName));
        db()->prepare('INSERT INTO authors (slug, name, bio) VALUES (?, ?, ?)')->execute([$slug, $slugOrName, $bio ?: null]);
        $stmt->execute([$slug, $slug]);
        $author = $stmt->fetch();
    } elseif ($bio !== null && $bio !== '' && $bio !== $author['bio']) {
        db()->prepare('UPDATE authors SET bio = ? WHERE id = ?')->execute([$bio, (int) $author['id']]);
        $author['bio'] = $bio;
    }
    return $author;
}

/** Records who did what in the admin area. */
function audit(array $admin, string $action, string $entityType, $entityId = null, array $details = []): void
{
    db()->prepare('INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([(int) $admin['id'], $action, $entityType, $entityId !== null ? (string) $entityId : null, $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null, client_ip()]);
}

/**
 * Validates the admin book form. Returns [$columns, $errors].
 * $columns maps directly to `books` columns (money in paise).
 */
function validate_book_input(array $in): array
{
    $errors = [];
    $str = fn (string $k) => input_string($in, $k);

    $title = preg_replace('/\s+/u', ' ', $str('title')) ?? '';
    if (mb_strlen($title) < 2 || mb_strlen($title) > 255) {
        $errors['title'] = 'Title must be 2–255 characters.';
    }
    $subtitle = $str('subtitle');
    if (mb_strlen($subtitle) > 255) {
        $errors['subtitle'] = 'Subtitle is too long.';
    }

    $category = find_category($str('category'));
    if (!$category) {
        $errors['category'] = 'Choose a category.';
    }

    $authorName = preg_replace('/\s+/u', ' ', $str('author')) ?? '';
    if (mb_strlen($authorName) < 2 || mb_strlen($authorName) > 120) {
        $errors['author'] = 'Enter the author’s name.';
    }
    $authorBio = $str('authorBio');
    if (mb_strlen($authorBio) > 500) {
        $errors['authorBio'] = 'Keep the author bio under 500 characters.';
    }

    $short = $str('description');
    if (mb_strlen($short) < 20 || mb_strlen($short) > 255) {
        $errors['description'] = 'Short description must be 20–255 characters.';
    }
    $long = $str('longDescription');
    if (mb_strlen($long) > 20000) {
        $errors['longDescription'] = 'Full description is too long.';
    }

    $pages = filter_var($in['pages'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 20000]]);
    if ($pages === false) {
        $errors['pages'] = 'Enter the number of pages (1–20000).';
    }

    $format = strtolower($str('format')) === 'epub' ? 'epub' : 'pdf';
    $language = $str('language') ?: 'English';
    if (mb_strlen($language) > 40) {
        $errors['language'] = 'Language is too long.';
    }
    $level = in_array($str('level'), ['Beginner', 'Intermediate', 'Advanced', 'All levels'], true) ? $str('level') : 'All levels';

    $published = $str('publishedAt');
    $date = DateTime::createFromFormat('!Y-m-d', $published);
    if ($published !== '' && (!$date || $date->format('Y-m-d') !== $published)) {
        $errors['publishedAt'] = 'Use a valid date.';
    }

    // Price comes in rupees; stored as paise. 0 = free.
    $priceRaw = $in['price'] ?? 0;
    $price = is_numeric($priceRaw) ? round((float) $priceRaw, 2) : -1;
    if ($price < 0 || $price > 100000) {
        $errors['price'] = 'Price must be between ₹0 and ₹1,00,000.';
    }
    $pricePaise = (int) round(max(0, $price) * 100);

    $isbn = strtoupper(preg_replace('/[\s-]+/', '', $str('isbn')) ?? '');
    if ($isbn !== '' && !preg_match('/^(\d{9}[\dX]|\d{13})$/', $isbn)) {
        $errors['isbn'] = 'ISBN must be 10 or 13 digits.';
    }
    $publisher = $str('publisher');

    $cleanList = function ($value, int $max, int $len) {
        if (!is_array($value)) {
            return [];
        }
        $items = array_map(fn ($v) => is_scalar($v) ? mb_substr(trim((string) $v), 0, $len) : '', $value);
        return array_slice(array_values(array_unique(array_filter($items, fn ($v) => $v !== ''))), 0, $max);
    };
    $tags = $cleanList(array_map(fn ($t) => is_scalar($t) ? mb_strtolower((string) $t) : '', is_array($in['tags'] ?? null) ? $in['tags'] : []), 12, 40);
    $learn = $cleanList($in['learn'] ?? [], 12, 200);
    $requirements = $cleanList($in['requirements'] ?? [], 12, 200);

    $cover = $in['cover'] ?? null;
    $coverDesign = null;
    if (is_array($cover)) {
        $hex = fn ($v) => is_string($v) && preg_match('/^#[0-9A-Fa-f]{6}$/', $v);
        $patterns = ['grid', 'rings', 'stripes', 'code', 'wave', 'blocks', 'orbit', 'arch', 'dots', 'sun'];
        if ($hex($cover['bg'] ?? null) && $hex($cover['fg'] ?? null) && $hex($cover['accent'] ?? null) && in_array($cover['pattern'] ?? '', $patterns, true)) {
            $coverDesign = json_encode(['bg' => $cover['bg'], 'fg' => $cover['fg'], 'accent' => $cover['accent'], 'pattern' => $cover['pattern']]);
        }
    }

    $status = in_array($str('status'), ['draft', 'published', 'unpublished'], true) ? $str('status') : 'draft';

    $columns = [
        'title'             => $title,
        'subtitle'          => $subtitle !== '' ? $subtitle : null,
        'category_id'       => $category['id'] ?? null,
        'short_description' => $short,
        'description'       => $long !== '' ? $long : null,
        'pages'             => $pages ?: null,
        'language'          => $language,
        'format'            => $format,
        'isbn'              => $isbn !== '' ? $isbn : null,
        'publisher'         => $publisher !== '' ? mb_substr($publisher, 0, 120) : null,
        'published_on'      => $published !== '' ? $published : null,
        'level'             => $level,
        'price_paise'       => $pricePaise,
        'is_free'           => $pricePaise === 0 ? 1 : 0,
        'status'            => $status,
        'is_enabled'        => !empty($in['available']) || !array_key_exists('available', $in) ? 1 : 0,
        'is_featured'       => !empty($in['featured']) ? 1 : 0,
        'cover_design'      => $coverDesign,
        'tags'              => json_encode($tags, JSON_UNESCAPED_UNICODE),
        'learn'             => json_encode($learn, JSON_UNESCAPED_UNICODE),
        'requirements'      => json_encode($requirements, JSON_UNESCAPED_UNICODE),
    ];
    return [$columns, $errors, ['name' => $authorName, 'bio' => $authorBio]];
}

/** A published book must have an e-book file, or buyers would receive nothing. */
function assert_publishable(array $book): void
{
    if (empty($book['file_path']) || !is_file(storage_path('books/' . basename((string) $book['file_path'])))) {
        json_error('Upload the e-book file (PDF or EPUB) before publishing.', 422, ['file' => 'An e-book file is required to publish.'], 'FILE_REQUIRED');
    }
}
