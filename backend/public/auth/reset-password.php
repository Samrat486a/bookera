<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/**
 * POST /api/auth/reset-password.php   { token, password }
 * Sets a new password, burns the token, signs out every other device,
 * and signs the member in here.
 */
require_post();
rate_limit('reset-ip:' . client_ip(), 20, 3600, 'Too many attempts.');

$in = json_body();
$token = input_string($in, 'token');
$errors = [];
$password = v_password((string) ($in['password'] ?? ''), $errors);

$invalid = fn () => json_error('This reset link is invalid or has expired. Please request a new one.', 400, [], 'RESET_TOKEN_INVALID');
if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    $invalid();
}
fail_if_errors($errors);

$user = db_transaction(function (PDO $pdo) use ($token, $password, $invalid) {
    $stmt = $pdo->prepare(
        'SELECT r.id AS reset_id, u.* FROM password_resets r JOIN users u ON u.id = r.user_id
          WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > UTC_TIMESTAMP() FOR UPDATE'
    );
    $stmt->execute([hash('sha256', $token)]);
    $row = $stmt->fetch();
    if (!$row || $row['status'] !== 'active') {
        $invalid();
    }
    $hash = hash_password($password);
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, (int) $row['id']]);
    $pdo->prepare('UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL')->execute([(int) $row['id']]);
    $row['password_hash'] = $hash;
    return $row;
});

rate_limit_clear('login:' . client_ip() . ':' . $user['email']);
login_user($user);   // new fingerprint → every other session for this account is now invalid

json_success('Your password has been updated.', ['user' => public_user($user), 'csrfToken' => csrf_token()]);
