<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/**
 * POST /api/users/change-password.php   { currentPassword, newPassword }
 * Signs out all other devices; this device stays signed in.
 */
require_post();
$user = require_auth();
rate_limit('change-pw:' . $user['id'], 10, 3600);

$in = json_body();
$errors = [];
if (!password_verify((string) ($in['currentPassword'] ?? ''), $user['password_hash'])) {
    $errors['currentPassword'] = 'Your current password is incorrect.';
}
$new = v_password((string) ($in['newPassword'] ?? ''), $errors, 'newPassword');
if ($new !== null && password_verify($new, $user['password_hash'])) {
    $errors['newPassword'] = 'Choose a password different from your current one.';
}
fail_if_errors($errors);

$user['password_hash'] = hash_password($new);
db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$user['password_hash'], (int) $user['id']]);
login_user($user);

json_success('Password changed. Other devices have been signed out.', ['user' => public_user($user), 'csrfToken' => csrf_token()]);
