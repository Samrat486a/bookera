<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/**
 * GET /api/books/list.php
 *   q          search words (title, subtitle, description, author, category, tags) — every word must match
 *   category   category slug or name
 *   author     author slug
 *   price      free | paid
 *   featured   1
 *   sort       featured (default) | newest | popular | rating | price_asc | price_desc | title
 *   page       1…      per_page  1–100 (default 24)
 * Only published, non-deleted books are returned.
 */
allow_methods('GET');

$where = ["b.status = 'published'", 'b.deleted_at IS NULL'];
$params = [];

$q = trim((string) ($_GET['q'] ?? ''));
if ($q !== '') {
    foreach (array_slice(preg_split('/\s+/u', mb_substr($q, 0, 100)) ?: [], 0, 6) as $word) {
        $like = '%' . addcslashes($word, '%_\\') . '%';
        $where[] = '(b.title LIKE ? OR b.subtitle LIKE ? OR b.short_description LIKE ? OR a.name LIKE ? OR c.name LIKE ? OR b.tags LIKE ?)';
        array_push($params, $like, $like, $like, $like, $like, $like);
    }
}
if (($cat = trim((string) ($_GET['category'] ?? ''))) !== '' && strcasecmp($cat, 'all') !== 0) {
    $where[] = '(c.slug = ? OR c.name = ?)';
    array_push($params, $cat, $cat);
}
if (($author = trim((string) ($_GET['author'] ?? ''))) !== '') {
    $where[] = 'a.slug = ?';
    $params[] = $author;
}
$price = strtolower((string) ($_GET['price'] ?? ''));
if ($price === 'free') {
    $where[] = 'b.is_free = 1';
} elseif ($price === 'paid' || $price === 'premium') {
    $where[] = 'b.is_free = 0';
}
if (!empty($_GET['featured'])) {
    $where[] = 'b.is_featured = 1';
}

$sorts = [
    'featured'   => 'b.is_featured DESC, b.is_enabled DESC, b.sales_count DESC, b.id DESC',
    'newest'     => 'b.published_on DESC, b.id DESC',
    'popular'    => 'b.sales_count DESC, b.rating_avg DESC, b.id DESC',
    'rating'     => 'b.rating_avg DESC, b.rating_count DESC, b.id DESC',
    'price_asc'  => 'b.price_paise ASC, b.id DESC',
    'price_desc' => 'b.price_paise DESC, b.id DESC',
    'title'      => 'b.title ASC',
];
$sortKey = (string) ($_GET['sort'] ?? 'featured');
$orderBy = $sorts[$sortKey] ?? $sorts['featured'];

$perPage = max(1, min(100, (int) ($_GET['per_page'] ?? 24)));
$page = max(1, (int) ($_GET['page'] ?? 1));
$offset = ($page - 1) * $perPage;

$from = ' FROM books b JOIN authors a ON a.id = b.author_id JOIN categories c ON c.id = b.category_id WHERE ' . implode(' AND ', $where);

$count = db()->prepare('SELECT COUNT(*)' . $from);
$count->execute($params);
$total = (int) $count->fetchColumn();

$stmt = db()->prepare(
    'SELECT b.*, a.slug AS author_slug, a.name AS author_name, a.bio AS author_bio, c.slug AS category_slug, c.name AS category_name'
    . $from . " ORDER BY $orderBy LIMIT $perPage OFFSET $offset"
);
$stmt->execute($params);

json_success('Books', [
    'books'      => array_map(fn ($b) => book_to_api($b), $stmt->fetchAll()),
    'pagination' => ['page' => $page, 'perPage' => $perPage, 'total' => $total, 'totalPages' => (int) ceil($total / $perPage)],
]);
