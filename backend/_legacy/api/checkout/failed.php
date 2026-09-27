<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';

/*
 * POST /api/checkout/failed.php  { orderId, reason }
 * Buyer closed Razorpay or the payment failed: no account is created. The hashed
 * guest password stays on the order for up to 24h (in case a late payment still
 * succeeds via the webhook) and is then wiped by cron/cleanup.php.
 */
require_method('POST');
require_same_origin();

$in = read_json();
$ref = (string) ($in['orderId'] ?? '');
$reason = substr(preg_replace('/[^A-Z_]/', '', strtoupper((string) ($in['reason'] ?? 'PAYMENT_FAILED'))) ?? '', 0, 40);

if ($ref !== '' && is_pending_order_of_session($ref)) {
    $status = $reason === 'PAYMENT_CANCELLED' ? 'cancelled' : 'failed';
    db()->prepare("UPDATE orders SET status = ?, failure_reason = ? WHERE ref = ? AND status = 'created'")
        ->execute([$status, $reason, $ref]);
}
json_ok(['done' => true]);
