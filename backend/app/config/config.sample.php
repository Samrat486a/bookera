<?php
/**
 * Bookera configuration — ALL secrets live here and nowhere else.
 *
 *   1. Copy this file to config.php in the same folder.
 *   2. Fill in the values for the environment (XAMPP or Hostinger).
 *
 * config.php is ignored by git, lives outside the public web folder,
 * and is never sent to the browser.
 */
return [
    // 'local' on your Mac, 'production' on Hostinger
    'env'   => 'local',
    // true shows error details in API responses — ALWAYS false in production
    'debug' => true,

    // Where the React site is served (used for links in emails, CORS, redirects)
    'app_url' => 'http://localhost:5173',

    // Browser origins allowed to call the API with cookies (no "*").
    // Production example: ['https://yourdomain.com', 'https://www.yourdomain.com']
    'cors_allowed_origins' => ['http://localhost:5173'],

    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'bookera',
        'user'    => 'root',                 // XAMPP default user
        'pass'    => '',                     // XAMPP default: empty password (local only!)
    ],

    'security' => [
        // Long random secret for signing download links & reset tokens.
        // Generate: php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
        'app_key'        => 'CHANGE_ME',
        'session_name'   => 'bookera_session',
        'session_days'   => 30,
        // true on HTTPS (production). false only for http://localhost
        'cookie_secure'  => false,
    ],

    'razorpay' => [
        // Razorpay Dashboard → Account & Settings → API Keys (Test mode first)
        'key_id'         => 'rzp_test_xxxxxxxxxxxxxx',
        'key_secret'     => 'CHANGE_ME',
        // Razorpay Dashboard → Webhooks → secret you choose
        'webhook_secret' => 'CHANGE_ME',
    ],

    'mail' => [
        'from_email' => 'books@yourdomain.com',
        'from_name'  => 'Bookera',
        'smtp_host'  => 'smtp.hostinger.com',
        'smtp_port'  => 465,
        'smtp_user'  => 'books@yourdomain.com',
        'smtp_pass'  => 'CHANGE_ME',
        // Local development: write emails to storage/logs/mail.log instead of sending
        'log_only'   => true,
    ],

    // Optional: override where private files live (defaults to app/storage)
    'storage_dir' => null,
];
