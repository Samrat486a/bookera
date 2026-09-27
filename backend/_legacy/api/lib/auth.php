<?php
declare(strict_types=1);

/* Session-based authentication helpers. */

function public_user(array $row): array
{
    return [
        'id'    => (int) $row['id'],
        'name'  => $row['name'],
        'email' => $row['email'],
        'role'  => $row['role'],
    ];
}

function current_user(): ?array
{
    static $cached = false;
    if ($cached !== false) {
        return $cached;
    }
    $uid = $_SESSION['uid'] ?? null;
    if (!$uid) {
        return $cached = null;
    }
    $stmt = db()->prepare('SELECT id, name, email, role FROM users WHERE id = ?');
    $stmt->execute([(int) $uid]);
    $row = $stmt->fetch();
    if (!$row) {
        unset($_SESSION['uid']);
        return $cached = null;
    }
    return $cached = $row;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        json_error('UNAUTHENTICATED', 'Please sign in to continue.', 401);
    }
    return $user;
}

function login_user(int $userId): void
{
    session_regenerate_id(true);
    $_SESSION['uid'] = $userId;
    db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$userId]);
}

function logout_user(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'  => time() - 42000,
            'path'     => $p['path'],
            'secure'   => $p['secure'],
            'httponly' => $p['httponly'],
            'samesite' => $p['samesite'] ?? 'Lax',
        ]);
    }
    session_destroy();
}

function find_user_by_email(string $email): ?array
{
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    return $stmt->fetch() ?: null;
}

/** Max 5 failed logins per email+IP in 15 minutes. */
function too_many_login_attempts(string $email): bool
{
    $stmt = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE email = ? AND ip = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)');
    $stmt->execute([$email, client_ip()]);
    return (int) $stmt->fetchColumn() >= 5;
}

function record_failed_login(string $email): void
{
    db()->prepare('INSERT INTO login_attempts (ip, email) VALUES (?, ?)')->execute([client_ip(), $email]);
}

function clear_failed_logins(string $email): void
{
    db()->prepare('DELETE FROM login_attempts WHERE email = ? AND ip = ?')->execute([$email, client_ip()]);
}
