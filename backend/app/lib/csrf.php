<?php
declare(strict_types=1);

/*
 * CSRF protection for every state-changing request (POST):
 *   1. The browser must send X-CSRF-Token matching the token stored in the
 *      member's session (the React app reads it from GET /auth/session.php).
 *   2. If the browser sends an Origin header, it must be our own site.
 * A malicious site can't read the token, so it can't forge requests.
 */

function csrf_token(): string
{
    session_boot();
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function allowed_origins(): array
{
    $origins = (array) config('cors_allowed_origins', []);
    $app = parse_url((string) config('app_url', ''));
    if (!empty($app['scheme']) && !empty($app['host'])) {
        $origins[] = $app['scheme'] . '://' . $app['host'] . (isset($app['port']) ? ':' . $app['port'] : '');
    }
    return array_unique($origins);
}

function require_csrf(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && !in_array($origin, allowed_origins(), true)) {
        json_error('Request blocked: unknown origin.', 403, [], 'BAD_ORIGIN');
    }

    session_boot();
    $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = $_SESSION['csrf'] ?? '';
    if ($sent === '' || !is_string($expected) || $expected === '' || !hash_equals($expected, $sent)) {
        json_error('Your session has expired. Please refresh the page and try again.', 403, [], 'CSRF_INVALID');
    }
}

/** Standard guard for POST endpoints: method + CSRF. */
function require_post(): void
{
    allow_methods('POST');
    require_csrf();
}
