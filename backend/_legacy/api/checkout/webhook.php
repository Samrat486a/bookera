<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';
require_once __DIR__ . '/../lib/razorpay.php';

/*
 * Razorpay webhook — backup delivery if the buyer closes the tab right after paying.
 * Dashboard → Webhooks → URL: https://yourdomain.com/api/checkout/webhook.php
 * Events: payment.captured, order.paid, payment.failed   Secret: same as config webhook_secret
 */
require_method('POST');

$raw = file_get_contents('php://input') ?: '';
$signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';
if (!razorpay_verify_webhook($raw, $signature)) {
    json_error('BAD_SIGNATURE', 'Invalid signature.', 400);
}

$event = json_decode($raw, true);
$type = $event['event'] ?? '';
$payment = $event['payload']['payment']['entity'] ?? [];
$rzpOrderId = $payment['order_id'] ?? ($event['payload']['order']['entity']['id'] ?? null);

if (!$rzpOrderId) json_ok(['ignored' => true]);

$stmt = db()->prepare('SELECT * FROM orders WHERE razorpay_order_id = ?');
$stmt->execute([$rzpOrderId]);
$order = $stmt->fetch();
if (!$order) json_ok(['ignored' => true]);

if ($type === 'payment.captured' || $type === 'order.paid') {
    if ((int) ($payment['amount'] ?? $order['amount_paise']) < (int) $order['amount_paise']) {
        error_log("[bookera] webhook amount mismatch for {$order['ref']}");
        json_ok(['ignored' => true]);
    }
    fulfil_order((int) $order['id'], $payment['id'] ?? null);
} elseif ($type === 'payment.failed' && $order['status'] === 'created') {
    $reason = substr((string) ($payment['error_code'] ?? 'PAYMENT_FAILED'), 0, 40);
    // Keep status 'created' so the buyer can still retry inside Razorpay; just note the reason.
    db()->prepare('UPDATE orders SET failure_reason = ? WHERE id = ?')->execute([$reason, $order['id']]);
}

json_ok(['received' => true]);
