<?php
declare(strict_types=1);
require __DIR__ . '/../../_init.php';

/** POST multipart /api/admin/books/upload-cover.php   fields: id, cover (JPG/PNG/WebP ≤ 5 MB) */
require_post();
$admin = require_admin();

$book = find_book_admin((int) ($_POST['id'] ?? 0));
if (!$book) {
    json_error('Book not found.', 404, [], 'NOT_FOUND');
}
$path = store_cover(uploaded_file('cover'));
db()->prepare('UPDATE books SET cover_path = ? WHERE id = ?')->execute([$path, (int) $book['id']]);
delete_stored_file($book['cover_path'], true);

audit($admin, 'book.cover', 'book', (int) $book['id']);
json_success('Cover uploaded', ['book' => book_to_api(find_book_admin((int) $book['id']), true)]);
