<?php
declare(strict_types=1);
require __DIR__ . '/../../_init.php';

/** GET /api/admin/books/list.php?status=&q=  — every non-deleted book, including drafts (admin only). */
allow_methods('GET');
require_admin();

$where = ['b.deleted_at IS NULL'];
$params = [];
$status = (string) ($_GET['status'] ?? '');
if (in_array($status, ['draft', 'published', 'unpublished'], true)) {
    $where[] = 'b.status = ?';
    $params[] = $status;
}
if (($q = trim((string) ($_GET['q'] ?? ''))) !== '') {
    $like = '%' . addcslashes(mb_substr($q, 0, 100), '%_\\') . '%';
    $where[] = '(b.title LIKE ? OR a.name LIKE ? OR c.name LIKE ? OR b.isbn LIKE ?)';
    array_push($params, $like, $like, $like, $like);
}
$stmt = db()->prepare(BOOK_SELECT . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY b.updated_at DESC LIMIT 1000');
$stmt->execute($params);

json_success('Books', ['books' => array_map(fn ($b) => book_to_api($b, true), $stmt->fetchAll())]);
