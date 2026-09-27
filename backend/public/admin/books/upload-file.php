<?php
declare(strict_types=1);
require __DIR__ . '/../../_init.php';

/** POST multipart /api/admin/books/upload-file.php   fields: id, file (PDF/EPUB ≤ 100 MB) — stored privately */
require_post();
$admin = require_admin();

$book = find_book_admin((int) ($_POST['id'] ?? 0));
if (!$book) {
    json_error('Book not found.', 404, [], 'NOT_FOUND');
}
$stored = store_ebook(uploaded_file('file'));
db()->prepare('UPDATE books SET file_path = ?, file_size = ?, file_mime = ?, format = ? WHERE id = ?')
    ->execute([$stored['path'], $stored['size'], $stored['mime'], $stored['format'], (int) $book['id']]);
if ($book['file_path'] && basename((string) $book['file_path']) !== $stored['path']) {
    delete_stored_file($book['file_path'], false);
}

audit($admin, 'book.file', 'book', (int) $book['id'], ['size' => $stored['size'], 'format' => $stored['format']]);
json_success('E-book file uploaded', ['book' => book_to_api(find_book_admin((int) $book['id']), true)]);
