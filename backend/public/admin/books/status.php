<?php
declare(strict_types=1);
require __DIR__ . '/../../_init.php';

/** POST /api/admin/books/status.php  { id, status?: draft|published|unpublished, available?: bool, featured?: bool } */
require_post();
$admin = require_admin();
$in = json_body();

$book = find_book_admin((int) ($in['id'] ?? 0));
if (!$book) {
    json_error('Book not found.', 404, [], 'NOT_FOUND');
}

$set = [];
$params = [];
if (array_key_exists('status', $in)) {
    $status = (string) $in['status'];
    if (!in_array($status, ['draft', 'published', 'unpublished'], true)) {
        json_error('Unknown status.', 422, ['status' => 'Use draft, published or unpublished.'], 'VALIDATION_FAILED');
    }
    if ($status === 'published') {
        assert_publishable($book);
    }
    $set[] = 'status = ?';
    $params[] = $status;
}
foreach (['available' => 'is_enabled', 'featured' => 'is_featured'] as $key => $col) {
    if (array_key_exists($key, $in)) {
        $set[] = "$col = ?";
        $params[] = $in[$key] ? 1 : 0;
    }
}
if (!$set) {
    json_error('Nothing to change.', 422, [], 'VALIDATION_FAILED');
}
$params[] = (int) $book['id'];
db()->prepare('UPDATE books SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

audit($admin, 'book.status', 'book', (int) $book['id'], array_intersect_key($in, array_flip(['status', 'available', 'featured'])));
$fresh = find_book_admin((int) $book['id']);
$message = match ($fresh['status']) {
    'published'   => '“' . $fresh['title'] . '” is live.',
    'unpublished' => '“' . $fresh['title'] . '” is hidden from readers.',
    default       => 'Saved as draft.',
};
json_success($message, ['book' => book_to_api($fresh, true)]);
