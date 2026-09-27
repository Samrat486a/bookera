<?php
declare(strict_types=1);

/*
 * Minimal Razorpay client (no SDK needed) — https://razorpay.com/docs/api/orders/
 */

function razorpay_request(string $method, string $path, ?array $body = null): array
{
    $ch = curl_init('https://api.razorpay.com/v1/' . ltrim($path, '/'));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_USERPWD        => config('razorpay.key_id') . ':' . config('razorpay.key_secret'),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        throw new RuntimeException('Razorpay request failed: ' . $err);
    }
    $data = json_decode((string) $raw, true);
    if ($status >= 400 || !is_array($data)) {
        $desc = is_array($data) ? ($data['error']['description'] ?? 'unknown error') : 'invalid response';
        throw new RuntimeException("Razorpay API error ($status): $desc");
    }
    return $data;
}

/** Creates a Razorpay order. Amount in paise. Auto-capture is on, so paid = captured. */
function razorpay_create_order(int $amountPaise, string $receipt, array $notes = []): array
{
    return razorpay_request('POST', 'orders', [
        'amount'          => $amountPaise,
        'currency'        => 'INR',
        'receipt'         => $receipt,
        'payment_capture' => 1,
        'notes'           => $notes,
    ]);
}

function razorpay_fetch_payment(string $paymentId): array
{
    return razorpay_request('GET', 'payments/' . rawurlencode($paymentId));
}

/** Checkout success handler signature: HMAC_SHA256(order_id|payment_id, key_secret) */
function razorpay_verify_payment_signature(string $orderId, string $paymentId, string $signature): bool
{
    $expected = hash_hmac('sha256', $orderId . '|' . $paymentId, (string) config('razorpay.key_secret'));
    return hash_equals($expected, $signature);
}

/** Webhook signature: HMAC_SHA256(raw_body, webhook_secret) */
function razorpay_verify_webhook(string $rawBody, string $signature): bool
{
    $expected = hash_hmac('sha256', $rawBody, (string) config('razorpay.webhook_secret'));
    return $signature !== '' && hash_equals($expected, $signature);
}
