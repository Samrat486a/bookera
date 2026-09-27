<?php
declare(strict_types=1);

/*
 * PHP sessions, configured for security.
 *
 *  • Cookie: HttpOnly (JavaScript can't read it), SameSite=Lax, Secure on HTTPS
 *  • Strict mode: PHP refuses session IDs it didn't create (blocks session fixation)
 *  • Sessions are stored in app/storage/sessions with our own lifetime, so the
 *    shared server's cleanup of /tmp can't sign members out early
 *  • Started lazily — only endpoints that need a session create a cookie
 */

function session_boot(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $days = max(1, (int) config('security.session_days', 30));
    $lifetime = $days * 86400;

    $dir = storage_path('sessions');
    if (!is_dir($dir)) {
        @mkdir($dir, 0770, true);
    }
    if (is_dir($dir) && is_writable($dir)) {
        session_save_path($dir);
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    ini_set('session.gc_maxlifetime', (string) $lifetime);
    ini_set('session.sid_length', '48');
    ini_set('session.sid_bits_per_character', '6');

    session_name((string) config('security.session_name', 'bookera_session'));
    session_set_cookie_params([
        'lifetime' => $lifetime,
        'path'     => '/',
        'secure'   => (bool) config('security.cookie_secure', true) || is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/** Issue a fresh session ID (after login / privilege change) — prevents session fixation. */
function session_rotate(): void
{
    session_boot();
    session_regenerate_id(true);
}

function session_destroy_completely(): void
{
    session_boot();
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 3600,
        'path'     => $p['path'],
        'secure'   => $p['secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_destroy();
}
