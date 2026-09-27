<?php
declare(strict_types=1);
require __DIR__ . '/../../_init.php';

/**
 * POST /api/admin/books/update.php  { id, ...same fields as create }
 * The URL slug is kept when the title changes, so existing links keep working.
 */
require_post();
$admin = require_admin();
$in = json_body();

$existing = find_book_admin((int) ($in['id'] ?? 0));
if (!$existing) {
    json_error('Book not found.', 404, [], 'NOT_FOUND');
}
[$cols, $errors, $author] = validate_book_input($in);
fail_if_errors($errors);
if ($cols['status'] === 'published') {
    assert_publishable($existing);
}

db_transaction(function (PDO $pdo) use (&$cols, $author, $existing) {
    $a = find_or_create_author($author['name'], $author['bio']);
    $cols['author_id'] = (int) $a['id'];
    if ($cols['isbn'] !== null) {
        $dup = $pdo->prepare('SELECT id FROM books WHERE isbn = ? AND id <> ?');
        $dup->execute([$cols['isbn'], (int) $existing['id']]);
        if ($dup->fetch()) {
            json_error('Another book already uses this ISBN.', 409, ['isbn' => 'This ISBN is already in the catalogue.'], 'DUPLICATE_ISBN');
        }
    }
    $set = implode(', ', array_map(fn ($c) => "$c = ?", array_keys($cols)));
    $pdo->prepare("UPDATE books SET $set WHERE id = ?")->execute([...array_values($cols), (int) $existing['id']]);
});

$changed = array_keys(array_filter($cols, fn ($v, $k) => array_key_exists($k, $existing) && (string) $existing[$k] !== (string) $v, ARRAY_FILTER_USE_BOTH));
audit($admin, 'book.update', 'book', (int) $existing['id'], ['changed' => array_values($changed)]);
json_success('E-book updated successfully.', ['book' => book_to_api(find_book_admin((int) $existing['id']), true)]);
