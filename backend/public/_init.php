<?php
declare(strict_types=1);

/**
 * Finds the private app/ folder and loads it. Every endpoint starts with:
 *   require __DIR__ . '/_init.php';          (or '/../_init.php' in sub-folders)
 *
 * Where app/ lives:
 *   Hostinger:  next to public_html, e.g. /home/uXXXX/domains/yourdomain.com/bookera_app
 *               (public_html/api/../../bookera_app) — or /home/uXXXX/bookera_app
 *   XAMPP:      /Applications/XAMPP/xamppfiles/bookera_app   (htdocs/bookera/api/../../../bookera_app)
 *   Override:   set BOOKERA_APP_DIR in .htaccess (SetEnv) if you use another place.
 */
define('PUBLIC_DIR', __DIR__);   // the public API folder (covers are uploaded into PUBLIC_DIR/uploads)

(function (): void {
    $candidates = array_filter([
        getenv('BOOKERA_APP_DIR') ?: ($_SERVER['BOOKERA_APP_DIR'] ?? null),
        __DIR__ . '/../../bookera_app',
        __DIR__ . '/../../../bookera_app',
        __DIR__ . '/../../../../bookera_app',      // Hostinger: /home/uXXXX/bookera_app
        __DIR__ . '/../app',                       // running straight from the repository
    ]);
    foreach ($candidates as $dir) {
        if (is_file($dir . '/bootstrap.php')) {
            require_once $dir . '/bootstrap.php';
            return;
        }
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Server not configured: application folder not found.', 'code' => 'APP_NOT_FOUND']);
    exit;
})();
