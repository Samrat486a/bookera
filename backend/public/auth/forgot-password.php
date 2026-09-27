<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/**
 * POST /api/auth/forgot-password.php   { email }
 *
 * Always answers the same way, so nobody can use it to discover which emails
 * have accounts. If the account exists, a one-time link valid for 60 minutes
 * is emailed. Only a SHA-256 hash of the token is stored.
 */
require_post();
rate_limit('forgot-ip:' . client_ip(), 10, 3600, 'Too many reset requests from this network.');

$errors = [];
$email = v_email(input_string(json_body(), 'email'), $errors);
fail_if_errors($errors);

$generic = 'If an account exists for that email, we’ve sent a link to reset the password. It expires in 60 minutes.';

// Max 3 emails per address per hour (silently — same answer either way).
if (rate_limit_hit('forgot:' . $email, 3, 3600) > 0) {
    json_success($generic);
}

$user = find_user_by_email($email);
if ($user && $user['status'] === 'active') {
    $token = bin2hex(random_bytes(32));
    $pdo = db();
    $pdo->prepare('UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL')->execute([(int) $user['id']]);
    $pdo->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at, requested_ip) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL 60 MINUTE, ?)')
        ->execute([(int) $user['id'], hash('sha256', $token), client_ip()]);

    $link = rtrim((string) config('app_url'), '/') . '/reset-password?token=' . $token;
    $first = explode(' ', $user['name'])[0];
    send_mail(
        $user['email'],
        $user['name'],
        'Reset your Bookera password',
        email_layout(
            'Reset your password',
            '<p>Hi ' . e($first) . ',</p><p>We received a request to reset the password for your Bookera account. This link works once and expires in 60 minutes.</p>'
            . '<p style="font-size:13px;color:#6B7079">Didn’t ask for this? You can safely ignore this email — your password won’t change.</p>',
            'Choose a new password',
            $link
        ),
        "Hi {$first},\n\nReset your Bookera password (link valid for 60 minutes, one use):\n{$link}\n\nDidn't ask for this? Ignore this email."
    );
}

json_success($generic);
