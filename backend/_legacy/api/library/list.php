<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';

$user = require_user();
$stmt = db()->prepare(
    'SELECT l.book_id, l.purchased_at, l.progress, l.last_page, l.amount, o.ref
       FROM library l LEFT JOIN orders o ON o.id = l.order_id
      WHERE l.user_id = ?
      ORDER BY l.purchased_at DESC'
);
$stmt->execute([(int) $user['id']]);
json_ok(['entries' => array_map('format_library_row', $stmt->fetchAll())]);
