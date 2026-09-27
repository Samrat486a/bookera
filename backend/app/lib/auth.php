<?php
declare(strict_types=1);

/*
 * Authentication.
 *
 * The signed-in member is identified ONLY by the server-side session — never by
 * a user id sent from the browser. The session also stores a fingerprint of the
 * password hash, so changing/resetting a password signs out every other device.
 */

// Used to keep login timing identical whether or not the email exists.
const DUMMY_BCRYPT_HASH = '$2y$10$U9.xRoIFwSXSaYh5NFD6Pe6Sv2L7cFYu2FvfKFvJyomV8NNRoWV5i';

function password_fingerprint(string $hash): string
{
    return substr(hash_hmac('sha256', $hash, (string) config('security.app_key')), 0, 32);
}

/** Shape sent to the React app (never includes the password hash). */
function public_user(array $u): array
{
    return [
        'id'               => (int) $u['id'],
        'name'             => $u['name'],
        'email'            => $u['email'],
        'phone'            => $u['phone'] ?? null,
        'role'             => $u['role'] === 'admin' ? 'admin' : 'reader',
        'bio'              => $u['bio'] ?? null,
        'readingInterests' => isset($u['reading_interests']) ? (json_decode((string) $u['reading_interests'], true) ?: []) : [],
        'createdAt'        => isset($u['created_at']) ? str_replace(' ', 'T', (string) $u['created_at']) . 'Z' : null,
    ];
}

function find_user_by_email(string $email): ?array
{
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    return $stmt->fetch() ?: null;
}

function find_user_by_id(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

/** The signed-in user, or null. Invalid/stale sessions are cleared. */
function current_user(): ?array
{
    static $resolved = false;
    static $user = null;
    if ($resolved) {
        return $user;
    }
    $resolved = true;

    // Don't create a session (or a cookie) just to find out nobody is signed in.
    if (session_status() !== PHP_SESSION_ACTIVE && !isset($_COOKIE[(string) config('security.session_name', 'bookera_session')])) {
        return null;
    }
    session_boot();
    $uid = $_SESSION['uid'] ?? null;
    if (!is_int($uid)) {
        return null;
    }
    $row = find_user_by_id($uid);
    if (!$row || $row['status'] !== 'active' || !hash_equals((string) ($_SESSION['pwd'] ?? ''), password_fingerprint($row['password_hash']))) {
        unset($_SESSION['uid'], $_SESSION['pwd']);   // blocked, deleted, or password changed elsewhere
        return null;
    }
    return $user = $row;
}

function require_auth(): array
{
    $user = current_user();
    if (!$user) {
        json_error('Please sign in to continue.', 401, [], 'UNAUTHENTICATED');
    }
    return $user;
}

/** Admin check happens here on the server for every admin request. */
function require_admin(): array
{
    $user = require_auth();
    if ($user['role'] !== 'admin') {
        json_error('You don’t have permission to do that.', 403, [], 'FORBIDDEN');
    }
    return $user;
}

function login_user(array $user): void
{
    session_rotate();                                // new session id → no session fixation
    $_SESSION['uid'] = (int) $user['id'];
    $_SESSION['pwd'] = password_fingerprint($user['password_hash']);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));   // fresh CSRF token for the new session
    $_SESSION['at'] = time();
    db()->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([(int) $user['id']]);
}

function logout_user(): void
{
    session_destroy_completely();
}

function hash_password(string $plain): string
{
    return password_hash($plain, PASSWORD_DEFAULT);
}
