<?php
declare(strict_types=1);

/**
 * Loaded by every API endpoint (via public/_init.php).
 * This folder (app/) must live OUTSIDE the public web root in production.
 */

define('APP_DIR', __DIR__);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
date_default_timezone_set('UTC');
mb_internal_encoding('UTF-8');

/* ── Configuration ── */

$configFile = APP_DIR . '/config/config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Server not configured: copy app/config/config.sample.php to config.php.', 'code' => 'NOT_CONFIGURED']);
    exit;
}
$GLOBALS['__config'] = require $configFile;

/** Read a config value with dot notation, e.g. config('db.name'). */
function config(string $key, $default = null)
{
    $value = $GLOBALS['__config'];
    foreach (explode('.', $key) as $part) {
        if (!is_array($value) || !array_key_exists($part, $value)) {
            return $default;
        }
        $value = $value[$part];
    }
    return $value;
}

function is_production(): bool
{
    return config('env') === 'production';
}

/** Absolute path inside the private storage folder (books, logs, tmp). */
function storage_path(string $sub = ''): string
{
    $base = rtrim((string) (config('storage_dir') ?: APP_DIR . '/storage'), '/');
    return $sub === '' ? $base : $base . '/' . ltrim($sub, '/');
}

/* ── Libraries ── */

require_once APP_DIR . '/lib/http.php';
require_once APP_DIR . '/lib/errors.php';
require_once APP_DIR . '/config/database.php';
require_once APP_DIR . '/lib/session.php';
require_once APP_DIR . '/lib/csrf.php';
require_once APP_DIR . '/lib/rate_limit.php';
require_once APP_DIR . '/lib/validate.php';
require_once APP_DIR . '/lib/auth.php';
require_once APP_DIR . '/lib/mailer.php';
require_once APP_DIR . '/lib/books.php';
require_once APP_DIR . '/lib/uploads.php';

/* ── Every web request ── */

if (PHP_SAPI !== 'cli') {
    send_security_headers();
    handle_cors();
}
