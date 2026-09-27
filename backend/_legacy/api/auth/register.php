<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';

require_method('POST');
require_same_origin();

$in = read_json();
$name = clean_name($in['name'] ?? '');
$email = clean_email($in['email'] ?? '');
$password = $in['password'] ?? '';

if ($name === '') json_error('INVALID_NAME', 'Please enter your full name.', 422);
if ($email === '') json_error('INVALID_EMAIL', 'Please enter a valid email address.', 422);
if (!valid_password($password)) json_error('WEAK_PASSWORD', 'Use at least 8 characters for your password.', 422);

if (find_user_by_email($email)) {
    json_error('ACCOUNT_EXISTS', 'An account with this email already exists. Please log in instead.', 409);
}

db()->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    ->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
$id = (int) db()->lastInsertId();
login_user($id);

json_ok(['user' => ['id' => $id, 'name' => $name, 'email' => $email, 'role' => 'reader']], 201);
