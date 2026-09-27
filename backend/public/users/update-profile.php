<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/**
 * POST /api/users/update-profile.php
 * { name, phone, bio?, readingInterests?, email?, currentPassword? }
 * Only ever updates the signed-in member (id comes from the session, not the request).
 * Changing the email requires the current password.
 */
require_post();
$user = require_auth();
$in = json_body();

$errors = [];
$name  = v_name(input_string($in, 'name'), $errors);
$phone = v_phone(input_string($in, 'phone'), $errors, false);

$bio = input_string($in, 'bio');
if (mb_strlen($bio) > 500) {
    $errors['bio'] = 'Keep your bio under 500 characters.';
}

$interests = $in['readingInterests'] ?? [];
if (!is_array($interests) || count($interests) > 20) {
    $errors['readingInterests'] = 'Choose up to 20 interests.';
    $interests = [];
}
$interests = array_values(array_unique(array_filter(array_map(
    fn ($i) => is_string($i) ? mb_substr(trim($i), 0, 60) : '',
    $interests
))));

$email = $user['email'];
$newEmail = input_string($in, 'email');
if ($newEmail !== '' && mb_strtolower($newEmail) !== $user['email']) {
    $email = v_email($newEmail, $errors);
    if ($email && !password_verify((string) ($in['currentPassword'] ?? ''), $user['password_hash'])) {
        $errors['currentPassword'] = 'Enter your current password to change your email.';
    }
    if ($email && find_user_by_email($email)) {
        $errors['email'] = 'This email is already used by another account.';
    }
}
fail_if_errors($errors);

db()->prepare('UPDATE users SET name = ?, phone = ?, bio = ?, reading_interests = ?, email = ? WHERE id = ?')
    ->execute([$name, $phone, $bio !== '' ? $bio : null, json_encode($interests, JSON_UNESCAPED_UNICODE), $email, (int) $user['id']]);

json_success('Profile updated', ['user' => public_user(find_user_by_id((int) $user['id']))]);
