<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';

require_method('POST');
require_same_origin();

$in = read_json();
$email = clean_email($in['email'] ?? '');
$password = (string) ($in['password'] ?? '');
if ($email === '' || $password === '') {
    json_error('INVALID_CREDENTIALS', 'Please enter your email and password.', 422);
}
if (too_many_login_attempts($email)) {
    json_error('TOO_MANY_ATTEMPTS', 'Too many attempts. Please wait 15 minutes and try again.', 429);
}

$user = find_user_by_email($email);
if (!$user || !password_verify($password, $user['password_hash'])) {
    record_failed_login($email);
    json_error('INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
}

if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}
clear_failed_logins($email);
login_user((int) $user['id']);

json_ok(['user' => public_user($user)]);
