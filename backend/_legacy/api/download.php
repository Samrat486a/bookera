<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/orders.php';

/*
 * GET /api/download.php?t=<signed token>
 * The "Download PDF" link from the purchase email (valid for 7 days, no login needed).
 */
$token = read_download_token((string) ($_GET['t'] ?? ''));
if ($token === null) {
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(410);
    $app = htmlspecialchars((string) config('app_url'), ENT_QUOTES);
    echo "<!doctype html><meta name=viewport content='width=device-width'><body style='font-family:sans-serif;padding:40px;background:#F6F4EE;color:#14171B'>"
        . "<h1>This download link has expired</h1><p>Sign in to your library to download your e-book anytime.</p>"
        . "<p><a href='{$app}/login' style='color:#3654FF'>Go to Bookera →</a></p></body>";
    exit;
}

$stmt = db()->prepare("SELECT * FROM orders WHERE ref = ? AND book_id = ? AND status = 'paid'");
$stmt->execute([$token['o'], $token['b']]);
$order = $stmt->fetch();
$book = $order ? find_book($order['book_id']) : null;
$path = $book ? book_pdf_path($book) : null;

if (!$order || !$book || $path === null) {
    json_error('NOT_FOUND', 'File not available.', 404);
}
stream_pdf($path, $book['title'], false);
