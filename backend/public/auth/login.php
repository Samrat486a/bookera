<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/**
 * POST /api/auth/login.php
 * { email, password }
 * Limits: 5 failed attempts per email+network per 15 min, 30 per network per 15 min.
 */
require_post();

$in = json_body();
$email = mb_strtolower(input_string($in, 'email'));
$password = (string) ($in['password'] ?? '');
if ($email === '' || $password === '') {
    json_error('Please enter your email and password.', 422, array_filter([
        'email'    => $email === '' ? 'Please enter your email.' : null,
        'password' => $password === '' ? 'Please enter your password.' : null,
    ]), 'VALIDATION_FAILED');
}

$ipKey = 'login-ip:' . client_ip();
$userKey = 'login:' . client_ip() . ':' . $email;
rate_limit($ipKey, 30, 900, 'Too many sign-in attempts from this network.');

// Locked after 5 failures: refuse BEFORE checking the password, so a correct
// guess can't slip through while the account is locked.
$locked = rate_limit_blocked($userKey, 5, 900);
if ($locked > 0) {
    header('Retry-After: ' . $locked);
    json_error('Too many failed attempts for this account. Try again in ' . (int) ceil($locked / 60) . ' minutes.', 429, [], 'RATE_LIMITED');
}

$user = find_user_by_email($email);
// Always run password_verify so response time doesn't reveal whether the email exists.
$ok = password_verify($password, $user['password_hash'] ?? DUMMY_BCRYPT_HASH) && $user !== null;

if (!$ok) {
    rate_limit($userKey, 5, 900, 'Too many failed attempts for this account.');
    json_error('Incorrect email or password.', 401, [], 'INVALID_CREDENTIALS');
}
if ($user['status'] !== 'active') {
    json_error('This account has been suspended. Please contact support.', 403, [], 'ACCOUNT_BLOCKED');
}

// Upgrade the hash automatically if PHP's default algorithm/cost has changed.
if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
    $user['password_hash'] = hash_password($password);
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$user['password_hash'], (int) $user['id']]);
}

rate_limit_clear($userKey);
login_user($user);

json_success('Login successful', ['user' => public_user($user), 'csrfToken' => csrf_token()]);
