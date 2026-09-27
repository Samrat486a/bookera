<?php
declare(strict_types=1);

/*
 * Fixed-window rate limiting stored in MySQL (works on shared hosting).
 *
 *   rate_limit('login:' . client_ip(), 10, 900);   // 10 attempts per 15 minutes
 */

/** Counts one hit. Returns seconds until the window resets if the limit is exceeded, otherwise 0. */
function rate_limit_hit(string $key, int $max, int $windowSeconds): int
{
    $key = substr($key, 0, 190);
    $pdo = db();
    // Start a new window if the old one has expired, otherwise add one hit.
    $pdo->prepare(
        'INSERT INTO rate_limits (rl_key, hits, window_start) VALUES (?, 1, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           hits = IF(window_start < UTC_TIMESTAMP() - INTERVAL ? SECOND, 1, hits + 1),
           window_start = IF(window_start < UTC_TIMESTAMP() - INTERVAL ? SECOND, UTC_TIMESTAMP(), window_start)'
    )->execute([$key, $windowSeconds, $windowSeconds]);

    $stmt = $pdo->prepare('SELECT hits, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), window_start + INTERVAL ? SECOND) AS remaining FROM rate_limits WHERE rl_key = ?');
    $stmt->execute([$windowSeconds, $key]);
    $row = $stmt->fetch();
    return ($row && (int) $row['hits'] > $max) ? max(1, (int) $row['remaining']) : 0;
}

/** Aborts with HTTP 429 when the limit is exceeded. */
function rate_limit(string $key, int $max, int $windowSeconds, string $message = 'Too many attempts. Please try again later.'): void
{
    $retry = rate_limit_hit($key, $max, $windowSeconds);
    if ($retry > 0) {
        header('Retry-After: ' . $retry);
        $minutes = (int) ceil($retry / 60);
        json_error($message . ($minutes > 0 ? " Try again in {$minutes} minute" . ($minutes === 1 ? '' : 's') . '.' : ''), 429, [], 'RATE_LIMITED');
    }
}

/** Seconds until unlocked if $key is already over its limit (does NOT count a hit), else 0. */
function rate_limit_blocked(string $key, int $max, int $windowSeconds): int
{
    $stmt = db()->prepare(
        'SELECT hits, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), window_start + INTERVAL ? SECOND) AS remaining
           FROM rate_limits WHERE rl_key = ? AND window_start >= UTC_TIMESTAMP() - INTERVAL ? SECOND'
    );
    $stmt->execute([$windowSeconds, substr($key, 0, 190), $windowSeconds]);
    $row = $stmt->fetch();
    return ($row && (int) $row['hits'] >= $max) ? max(1, (int) $row['remaining']) : 0;
}

function rate_limit_clear(string $key): void
{
    db()->prepare('DELETE FROM rate_limits WHERE rl_key = ?')->execute([substr($key, 0, 190)]);
}
