<?php
declare(strict_types=1);

/**
 * GET /api/  — health check.
 * Confirms PHP runs, config loads and MySQL is reachable.
 * Details are shown only when debug is on (local); production reveals nothing internal.
 */
require __DIR__ . '/_init.php';

allow_methods('GET');

$pdo = db();
$tables = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchColumn();

$data = ['status' => 'ok', 'database' => 'connected'];

if (config('debug')) {
    $data += [
        'environment'   => config('env'),
        'php_version'   => PHP_VERSION,
        'mysql_version' => $pdo->query('SELECT VERSION()')->fetchColumn(),
        'database_name' => $pdo->query('SELECT DATABASE()')->fetchColumn(),
        'tables'        => $tables,
        'books'         => (int) $pdo->query('SELECT COUNT(*) FROM books')->fetchColumn(),
        'categories'    => (int) $pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn(),
        'users'         => (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
        'storage_writable' => is_writable(storage_path('logs')),
        'server_time_utc'  => gmdate('c'),
    ];
}

if ($tables < 18) {
    json_error('Database is reachable but the schema is incomplete — import backend/database/schema.sql.', 500, [], 'SCHEMA_MISSING');
}

json_success('Bookera API is running', $data);
