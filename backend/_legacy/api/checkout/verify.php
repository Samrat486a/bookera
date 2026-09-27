<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';
require_once __DIR__ . '/../lib/razorpay.php';

/*
 * POST /api/checkout/verify.php
 * { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Called by the browser right after Razorpay Checkout succeeds.
 */
require_method('POST');
require_same_origin();

$in = read_json();
$ref = (string) ($in['orderId'] ?? '');
$rzpOrderId = (string) ($in['razorpay_order_id'] ?? '');
$paymentId = (string) ($in['razorpay_payment_id'] ?? '');
$signature = (string) ($in['razorpay_signature'] ?? '');

$stmt = db()->prepare('SELECT * FROM orders WHERE ref = ? AND razorpay_order_id = ?');
$stmt->execute([$ref, $rzpOrderId]);
$order = $stmt->fetch();
if (!$order) json_error('NOT_FOUND', 'Order not found.', 404);

if (!razorpay_verify_payment_signature($rzpOrderId, $paymentId, $signature)) {
    db()->prepare("UPDATE orders SET failure_reason = 'BAD_SIGNATURE' WHERE id = ? AND status = 'created'")->execute([$order['id']]);
    json_error('PAYMENT_UNVERIFIED', 'We couldn’t verify this payment. If money was deducted, it will be refunded automatically — or contact us with your order number.', 400);
}

$result = fulfil_order((int) $order['id'], $paymentId);

// Sign the buyer in — but only in the browser session that started this order.
$me = current_user();
if (is_pending_order_of_session($ref) || ($me !== null && (int) $me['id'] === (int) $result['user']['id'])) {
    login_user((int) $result['user']['id']);
}

json_ok(purchase_result($result));
