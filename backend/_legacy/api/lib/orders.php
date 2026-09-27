<?php
declare(strict_types=1);

require_once __DIR__ . '/files.php';
require_once __DIR__ . '/mailer.php';

function new_order_ref(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $rand = '';
    for ($i = 0; $i < 4; $i++) {
        $rand .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return 'BKR-' . date('ymd') . '-' . $rand;
}

function find_book(string $bookId): ?array
{
    $stmt = db()->prepare('SELECT * FROM books WHERE id = ?');
    $stmt->execute([$bookId]);
    return $stmt->fetch() ?: null;
}

function user_owns_book(int $userId, string $bookId): bool
{
    $stmt = db()->prepare('SELECT 1 FROM library WHERE user_id = ? AND book_id = ?');
    $stmt->execute([$userId, $bookId]);
    return (bool) $stmt->fetchColumn();
}

function library_entry(int $userId, string $bookId): ?array
{
    $stmt = db()->prepare(
        'SELECT l.book_id, l.purchased_at, l.progress, l.last_page, l.amount, o.ref
           FROM library l LEFT JOIN orders o ON o.id = l.order_id
          WHERE l.user_id = ? AND l.book_id = ?'
    );
    $stmt->execute([$userId, $bookId]);
    $row = $stmt->fetch();
    return $row ? format_library_row($row) : null;
}

/** Shape a library row like the frontend's LibraryEntry type. */
function format_library_row(array $row): array
{
    return [
        'bookId'   => $row['book_id'],
        'addedAt'  => substr((string) $row['purchased_at'], 0, 10),
        'progress' => (int) $row['progress'],
        'lastPage' => $row['last_page'] !== null ? (int) $row['last_page'] : null,
        'orderId'  => $row['ref'] ?? null,
        'amount'   => (int) $row['amount'],
    ];
}

/** Remember orders started in this browser so only the buyer's session is signed in afterwards. */
function remember_pending_order(string $ref): void
{
    $list = $_SESSION['pending_orders'] ?? [];
    $list[] = $ref;
    $_SESSION['pending_orders'] = array_slice(array_unique($list), -10);
}

function is_pending_order_of_session(string $ref): bool
{
    return in_array($ref, $_SESSION['pending_orders'] ?? [], true);
}

/**
 * Marks an order as paid and delivers the book — safe to call more than once
 * (from the browser *and* the Razorpay webhook). Creates the member account for
 * guest buyers only at this point, i.e. after payment succeeded.
 *
 * @return array{user: array, entry: array, emailSent: bool, orderRef: string}
 */
function fulfil_order(int $orderId, ?string $paymentId): array
{
    $db = db();
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT * FROM orders WHERE id = ? FOR UPDATE');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            throw new RuntimeException("Order $orderId not found");
        }

        if ($order['status'] !== 'paid') {
            // 1. Find or create the member
            $userId = $order['user_id'] !== null ? (int) $order['user_id'] : null;
            if ($userId === null) {
                $existing = find_user_by_email($order['customer_email']);
                if ($existing) {
                    // Account created in the meantime — attach the purchase, keep their password.
                    $userId = (int) $existing['id'];
                } else {
                    $hash = $order['pending_password_hash'] ?: password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
                    $db->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
                        ->execute([$order['customer_name'], $order['customer_email'], $hash]);
                    $userId = (int) $db->lastInsertId();
                }
            }

            // 2. Add the book to their library
            $db->prepare(
                'INSERT INTO library (user_id, book_id, order_id, amount) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE order_id = COALESCE(order_id, VALUES(order_id))'
            )->execute([$userId, $order['book_id'], $order['id'], intdiv((int) $order['amount_paise'], 100)]);

            // 3. Mark paid and forget the pending password
            $db->prepare(
                "UPDATE orders SET status = 'paid', user_id = ?, razorpay_payment_id = COALESCE(?, razorpay_payment_id),
                        pending_password_hash = NULL, failure_reason = NULL, paid_at = NOW()
                  WHERE id = ?"
            )->execute([$userId, $paymentId, $order['id']]);

            $order['status'] = 'paid';
            $order['user_id'] = $userId;
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    $userId = (int) $order['user_id'];
    $stmt = db()->prepare('SELECT id, name, email, role FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    $book = find_book($order['book_id']);

    // 4. Email the book once
    $emailSent = $order['email_sent_at'] !== null;
    if (!$emailSent && $book) {
        $emailSent = send_book_email($user, $book, $order);
        if ($emailSent) {
            db()->prepare('UPDATE orders SET email_sent_at = NOW() WHERE id = ? AND email_sent_at IS NULL')->execute([$order['id']]);
        }
    }

    return [
        'user'      => $user,
        'entry'     => library_entry($userId, $order['book_id']),
        'emailSent' => $emailSent,
        'orderRef'  => $order['ref'],
    ];
}

function purchase_result(array $fulfilled): array
{
    return [
        'orderId'   => $fulfilled['orderRef'],
        'user'      => public_user($fulfilled['user']),
        'entry'     => $fulfilled['entry'],
        'emailSent' => $fulfilled['emailSent'],
    ];
}
