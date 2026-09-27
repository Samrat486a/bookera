<?php
declare(strict_types=1);

/*
 * Daily housekeeping. Hostinger → Advanced → Cron Jobs:
 *   php /home/u123456789/public_html/api/cron/cleanup.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/../bootstrap.php';

// Unpaid checkouts older than 24h: close them and wipe the stored guest password hash.
$closed = db()->exec(
    "UPDATE orders SET status = IF(status = 'created', 'cancelled', status), pending_password_hash = NULL
      WHERE status <> 'paid' AND created_at < (NOW() - INTERVAL 24 HOUR)
        AND (status = 'created' OR pending_password_hash IS NOT NULL)"
);
$purged = db()->exec('DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)');

echo "Closed {$closed} stale orders, purged {$purged} login attempts\n";
