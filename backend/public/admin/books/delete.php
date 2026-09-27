<?php
declare(strict_types=1);
require __DIR__ . '/../../_init.php';

/**
 * POST /api/admin/books/delete.php  { id }
 * Soft delete: the book disappears from the site and admin lists, is removed from
 * carts and wishlists, but order history stays intact and members who already
 * bought it keep access to their copy.
 */
require_post();
$admin = require_admin();

$book = find_book_admin((int) (json_body()['id'] ?? 0));
if (!$book) {
    json_error('Book not found.', 404, [], 'NOT_FOUND');
}

db_transaction(function (PDO $pdo) use ($book) {
    $pdo->prepare("UPDATE books SET deleted_at = UTC_TIMESTAMP(), status = 'unpublished', is_featured = 0 WHERE id = ?")->execute([(int) $book['id']]);
    $pdo->prepare('DELETE FROM cart_items WHERE book_id = ?')->execute([(int) $book['id']]);
    $pdo->prepare('DELETE FROM wishlists WHERE book_id = ?')->execute([(int) $book['id']]);
});

audit($admin, 'book.delete', 'book', (int) $book['id'], ['title' => $book['title']]);
json_success('“' . $book['title'] . '” was deleted.');
