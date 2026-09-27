<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/**
 * GET /api/auth/session.php
 * Called when the React app starts: who is signed in (or null) + the CSRF token
 * the app must send in the X-CSRF-Token header on every POST.
 */
allow_methods('GET');

$user = current_user();
json_success($user ? 'Signed in' : 'Not signed in', [
    'user'      => $user ? public_user($user) : null,
    'csrfToken' => csrf_token(),
]);
