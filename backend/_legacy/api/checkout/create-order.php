<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';
require_once __DIR__ . '/../lib/razorpay.php';

/*
 * POST /api/checkout/create-order.php
 * { bookId, customer?: { name, email, password } }
 *
 * Signed-in members buy as themselves. Guests send the same details as the
 * sign-up form; they are only stored (password hashed) on the order until the
 * payment succeeds — no account exists for unpaid orders.
 */
require_method('POST');
require_same_origin();

$in = read_json();
$bookId = (string) ($in['bookId'] ?? '');
$book = $bookId !== '' ? find_book($bookId) : null;
if (!$book || $book['status'] !== 'published') json_error('NOT_FOUND', 'This e-book isn’t available.', 404);
if (!(int) $book['available']) json_error('UNAVAILABLE', 'This e-book is currently unavailable.', 409);

$user = current_user();
$passwordHash = null;

if ($user) {
    if (user_owns_book((int) $user['id'], $bookId)) {
        json_error('ALREADY_OWNED', 'You already own this e-book — it’s in your library.', 409);
    }
    $name = $user['name'];
    $email = $user['email'];
} else {
    $c = is_array($in['customer'] ?? null) ? $in['customer'] : [];
    $name = clean_name($c['name'] ?? '');
    $email = clean_email($c['email'] ?? '');
    $password = $c['password'] ?? '';
    if ($name === '') json_error('INVALID_NAME', 'Please enter your full name.', 422);
    if ($email === '') json_error('INVALID_EMAIL', 'Please enter a valid email address.', 422);
    if (!valid_password($password)) json_error('WEAK_PASSWORD', 'Use at least 8 characters for your password.', 422);
    if (find_user_by_email($email)) {
        json_error('ACCOUNT_EXISTS', 'You already have a Bookera account with this email. Please log in to continue.', 409);
    }
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
}

$amountPaise = (int) $book['price'] * 100;
$ref = new_order_ref();

$insert = db()->prepare(
    'INSERT INTO orders (ref, user_id, book_id, amount_paise, customer_name, customer_email, pending_password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
for ($i = 0; ; $i++) {
    try {
        $insert->execute([$ref, $user ? (int) $user['id'] : null, $bookId, $amountPaise, $name, $email, $passwordHash]);
        break;
    } catch (PDOException $e) {
        if ($i >= 3 || $e->getCode() !== '23000') throw $e;   // retry on the rare duplicate ref
        $ref = new_order_ref();
    }
}
$orderId = (int) db()->lastInsertId();
remember_pending_order($ref);

$base = [
    'orderId'   => $ref,
    'amount'    => $amountPaise,
    'currency'  => 'INR',
    'bookTitle' => $book['title'],
    'customer'  => ['name' => $name, 'email' => $email],
];

// Free e-books: deliver immediately, no payment step.
if ($amountPaise === 0) {
    $result = fulfil_order($orderId, null);
    login_user((int) $result['user']['id']);
    json_ok($base + ['free' => true, 'purchase' => purchase_result($result)]);
}

try {
    $rzp = razorpay_create_order($amountPaise, $ref, ['order_ref' => $ref, 'book_id' => $bookId, 'email' => $email]);
} catch (Throwable $e) {
    error_log('[bookera] ' . $e->getMessage());
    db()->prepare("UPDATE orders SET status = 'failed', failure_reason = 'GATEWAY_ERROR', pending_password_hash = NULL WHERE id = ?")->execute([$orderId]);
    json_error('GATEWAY_ERROR', 'We couldn’t reach the payment gateway. Please try again in a moment.', 502);
}

db()->prepare('UPDATE orders SET razorpay_order_id = ? WHERE id = ?')->execute([$rzp['id'], $orderId]);

json_ok($base + [
    'free'            => false,
    'razorpayOrderId' => $rzp['id'],
    'keyId'           => config('razorpay.key_id'),
]);
