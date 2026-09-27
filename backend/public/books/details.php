<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/** GET /api/books/details.php?slug=<slug>  — one published book + up to 3 related titles. */
allow_methods('GET');

$slug = trim((string) ($_GET['slug'] ?? $_GET['id'] ?? ''));
if ($slug === '' || strlen($slug) > 160) {
    json_error('Book not found.', 404, [], 'NOT_FOUND');
}
$book = find_public_book($slug);
if (!$book) {
    json_error('This e-book isn’t available.', 404, [], 'NOT_FOUND');
}

$related = db()->prepare(
    BOOK_SELECT . " WHERE b.status = 'published' AND b.deleted_at IS NULL AND b.id <> ?
                     AND (b.category_id = ? OR b.author_id = ?)
                   ORDER BY (b.author_id = ?) DESC, b.sales_count DESC LIMIT 3"
);
$related->execute([(int) $book['id'], (int) $book['category_id'], (int) $book['author_id'], (int) $book['author_id']]);

$author = [
    'id'   => $book['author_slug'],
    'name' => $book['author_name'],
    'bio'  => $book['author_bio'],
];

json_success('Book', [
    'book'    => book_to_api($book),
    'author'  => $author,
    'related' => array_map(fn ($b) => book_to_api($b), $related->fetchAll()),
]);
