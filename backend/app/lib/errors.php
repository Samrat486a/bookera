<?php
declare(strict_types=1);

/*
 * Error handling: every PHP warning becomes an exception, every uncaught
 * exception is logged to storage/logs and answered with a JSON 500.
 * In production the browser only ever sees a generic message.
 */

function log_error(string $message, array $context = []): void
{
    $dir = storage_path('logs');
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $line = sprintf(
        "[%s] %s %s%s\n",
        gmdate('Y-m-d H:i:s'),
        ($_SERVER['REQUEST_METHOD'] ?? 'CLI') . ' ' . ($_SERVER['REQUEST_URI'] ?? ''),
        $message,
        $context ? ' ' . json_encode($context, JSON_UNESCAPED_SLASHES) : ''
    );
    // Fall back to PHP's own error log if the storage folder isn't writable
    if (@file_put_contents($dir . '/app-' . gmdate('Y-m-d') . '.log', $line, FILE_APPEND | LOCK_EX) === false) {
        error_log('[bookera] ' . $line);
    }
}

set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function (Throwable $e): void {
    log_error(get_class($e) . ': ' . $e->getMessage(), ['at' => basename($e->getFile()) . ':' . $e->getLine()]);
    $message = config('debug')
        ? get_class($e) . ': ' . $e->getMessage() . ' (' . basename($e->getFile()) . ':' . $e->getLine() . ')'
        : 'Something went wrong on our side. Please try again.';
    json_error($message, 500, [], 'SERVER_ERROR');
});
