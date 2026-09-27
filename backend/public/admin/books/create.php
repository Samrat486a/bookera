<?php
declare(strict_types=1);
require __DIR__ . '/../../_init.php';

/**
 * POST /api/admin/books/create.php  (JSON — see validate_book_input)
 * Always saved as a draft first: the cover and e-book file are uploaded next,
 * then the book can be published with status.php.
 */
require_post();
$admin = require_admin();

[$cols, $errors, $author] = validate_book_input(json_body());
fail_if_errors($errors);

$bookId = db_transaction(function (PDO $pdo) use ($cols, $author, $admin) {
    $a = find_or_create_author($author['name'], $author['bio']);
    $cols['author_id'] = (int) $a['id'];
    $cols['slug'] = unique_slug('books', make_slug($cols['title']));
    $cols['status'] = 'draft';
    $cols['created_by'] = (int) $admin['id'];
    if ($cols['isbn'] !== null) {
        $dup = $pdo->prepare('SELECT id FROM books WHERE isbn = ?');
        $dup->execute([$cols['isbn']]);
        if ($dup->fetch()) {
            json_error('Another book already uses this ISBN.', 409, ['isbn' => 'This ISBN is already in the catalogue.'], 'DUPLICATE_ISBN');
        }
    }
    $names = array_keys($cols);
    $pdo->prepare('INSERT INTO books (' . implode(', ', $names) . ') VALUES (' . implode(', ', array_fill(0, count($names), '?')) . ')')
        ->execute(array_values($cols));
    return (int) $pdo->lastInsertId();
});

$book = find_book_admin($bookId);
audit($admin, 'book.create', 'book', $bookId, ['title' => $book['title'], 'slug' => $book['slug']]);
json_success('Draft saved', ['book' => book_to_api($book, true)], 201);
