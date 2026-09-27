<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/**
 * POST /api/auth/register.php
 * { name, email, phone, password }  → creates a customer account and signs it in.
 */
require_post();
rate_limit('register:' . client_ip(), 10, 3600, 'Too many sign-ups from this network.');

$in = json_body();
$errors = [];
$name     = v_name(input_string($in, 'name'), $errors);
$email    = v_email(input_string($in, 'email'), $errors);
$phone    = v_phone(input_string($in, 'phone'), $errors);
$password = v_password((string) ($in['password'] ?? ''), $errors);
fail_if_errors($errors);

if (find_user_by_email($email)) {
    json_error('An account with this email already exists. Please log in instead.', 409, ['email' => 'This email is already registered.'], 'ACCOUNT_EXISTS');
}

try {
    db()->prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
        ->execute([$name, $email, $phone, hash_password($password)]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {   // two sign-ups raced for the same email
        json_error('An account with this email already exists. Please log in instead.', 409, ['email' => 'This email is already registered.'], 'ACCOUNT_EXISTS');
    }
    throw $e;
}

$user = find_user_by_id((int) db()->lastInsertId());
login_user($user);

json_success('Account created', ['user' => public_user($user), 'csrfToken' => csrf_token()], 201);
