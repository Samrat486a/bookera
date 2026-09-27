<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';

/*
 * GET /api/library/pdf.php?book=<id>[&download=1]
 * Streams the PDF only to signed-in members who own the book.
 */
$user = require_user();
$bookId = (string) ($_GET['book'] ?? '');
$book = $bookId !== '' ? find_book($bookId) : null;

if (!$book) json_error('NOT_FOUND', 'E-book not found.', 404);
if (!user_owns_book((int) $user['id'], $bookId)) json_error('FORBIDDEN', 'This e-book isn’t in your library.', 403);

$path = book_pdf_path($book);
if ($path === null) {
    error_log("[bookera] PDF missing for book {$bookId}");
    json_error('FILE_MISSING', 'This e-book’s file is being prepared. Please try again soon.', 404);
}

stream_pdf($path, $book['title'], empty($_GET['download']));
