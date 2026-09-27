<?php
declare(strict_types=1);

/**
 * Shared PDO connection.
 *
 *  • Exceptions on every SQL error (never silent failures)
 *  • Real prepared statements (EMULATE_PREPARES off) → SQL-injection safe
 *  • utf8mb4 + UTC + strict SQL mode on every connection, so XAMPP and
 *    Hostinger behave identically
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $c = config('db');
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], (int) ($c['port'] ?? 3306), $c['name']);

    try {
        $pdo = new PDO($dsn, (string) $c['user'], (string) $c['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_STRINGIFY_FETCHES  => false,
            PDO::ATTR_TIMEOUT            => 5,
        ]);
        $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+00:00', "
            . "sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
    } catch (PDOException $e) {
        // Log the real reason; never send credentials or host details to the browser.
        log_error('Database connection failed: ' . $e->getMessage());
        json_error('The service is temporarily unavailable. Please try again shortly.', 503, [], 'DB_UNAVAILABLE');
    }

    return $pdo;
}

/** Runs $fn inside a transaction; rolls back on any exception. */
function db_transaction(callable $fn)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $result = $fn($pdo);
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}
