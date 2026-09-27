<?php
declare(strict_types=1);

/**
 * Shared setup for every endpoint: config, errors, sessions, database, JSON helpers.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

if (!is_file(__DIR__ . '/config.php')) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_CONFIGURED', 'message' => 'The server is not configured yet.']]);
    exit;
}

/** @var array $CONFIG */
$CONFIG = require __DIR__ . '/config.php';

function config(string $path, $default = null)
{
    global $CONFIG;
    $value = $CONFIG;
    foreach (explode('.', $path) as $key) {
        if (!is_array($value) || !array_key_exists($key, $value)) {
            return $default;
        }
        $value = $value[$key];
    }
    return $value;
}

set_exception_handler(function (Throwable $e): void {
    error_log('[bookera] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    $message = config('dev') ? $e->getMessage() : 'Something went wrong on our side. Please try again.';
    echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $message]]);
});

/* ─────────── Sessions ─────────── */

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('bookera_sid');
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30,
    'path'     => '/',
    'secure'   => $https,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

/* ─────────── Database ─────────── */

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', config('db.host'), config('db.name'));
        $pdo = new PDO($dsn, config('db.user'), config('db.pass'), [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

/* ─────────── JSON helpers ─────────── */

function json_ok($data = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $code, string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => ['code' => $code, 'message' => $message]], JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 64 * 1024) {
        json_error('TOO_LARGE', 'Request is too large.', 413);
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $method) {
        header('Allow: ' . $method);
        json_error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
    }
}

/**
 * Blocks cross-site form posts: the SPA always sends a custom header (which browsers
 * won't send cross-origin without CORS, and we don't enable CORS) and a same-site Origin.
 */
function require_same_origin(): void
{
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'bookera') {
        json_error('FORBIDDEN', 'Invalid request.', 403);
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && !config('dev')) {
        $allowed = parse_url((string) config('app_url'), PHP_URL_HOST);
        if (parse_url($origin, PHP_URL_HOST) !== $allowed) {
            json_error('FORBIDDEN', 'Invalid request origin.', 403);
        }
    }
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

/* ─────────── Validation ─────────── */

function clean_email($value): string
{
    $email = strtolower(trim((string) $value));
    return filter_var($email, FILTER_VALIDATE_EMAIL) && strlen($email) <= 190 ? $email : '';
}

function clean_name($value): string
{
    $name = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    return mb_strlen($name) >= 2 && mb_strlen($name) <= 120 ? $name : '';
}

function valid_password($value): bool
{
    return is_string($value) && strlen($value) >= 8 && strlen($value) <= 200;
}

require_once __DIR__ . '/lib/auth.php';
