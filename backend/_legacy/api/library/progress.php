<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';

require_method('POST');
require_same_origin();
$user = require_user();

$in = read_json();
$bookId = (string) ($in['bookId'] ?? '');
$progress = max(0, min(100, (int) ($in['progress'] ?? 0)));
$lastPage = max(1, (int) ($in['lastPage'] ?? 1));

db()->prepare('UPDATE library SET progress = GREATEST(progress, ?), last_page = ? WHERE user_id = ? AND book_id = ?')
    ->execute([$progress, $lastPage, (int) $user['id'], $bookId]);

json_ok(['saved' => true]);
