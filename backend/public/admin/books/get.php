<?php
declare(strict_types=1);
require __DIR__ . '/../../_init.php';

/** GET /api/admin/books/get.php?id=<numeric id> — full book for the edit form. */
allow_methods('GET');
require_admin();

$book = find_book_admin((int) ($_GET['id'] ?? 0));
if (!$book) {
    json_error('Book not found.', 404, [], 'NOT_FOUND');
}
json_success('Book', ['book' => book_to_api($book, true)]);
