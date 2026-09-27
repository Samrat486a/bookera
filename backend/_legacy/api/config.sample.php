<?php
/**
 * Copy this file to config.php (same folder) and fill in your real values.
 * config.php is blocked from web access by .htaccess — never commit it or share it.
 */
return [
    // Public URL of the site (no trailing slash)
    'app_url' => 'https://yourdomain.com',

    // Long random string used to sign email download links.
    // Generate one at https://www.random.org/strings/ or with: php -r "echo bin2hex(random_bytes(32));"
    'app_secret' => 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',

    // Hostinger → Websites → Manage → Databases → MySQL Databases
    'db' => [
        'host' => 'localhost',
        'name' => 'u123456789_bookera',
        'user' => 'u123456789_bookera',
        'pass' => 'YOUR_DATABASE_PASSWORD',
    ],

    // Razorpay Dashboard → Account & Settings → API Keys (use Test Mode keys first)
    'razorpay' => [
        'key_id'         => 'rzp_test_xxxxxxxxxxxx',
        'key_secret'     => 'YOUR_RAZORPAY_KEY_SECRET',
        // Razorpay Dashboard → Webhooks → Add: https://yourdomain.com/api/checkout/webhook.php
        // Events: payment.captured, order.paid, payment.failed
        'webhook_secret' => 'YOUR_WEBHOOK_SECRET',
    ],

    // Where purchased PDFs are stored — OUTSIDE public_html so they can't be linked directly.
    // Put each book's PDF in STORAGE_DIR/books/<pdf_file from the books table>.
    'storage_dir' => '/home/u123456789/bookera_storage',

    // Email (Hostinger → Emails → create e.g. books@yourdomain.com)
    'mail' => [
        'from_email' => 'books@yourdomain.com',
        'from_name'  => 'Bookera',
        'smtp_host'  => 'smtp.hostinger.com',
        'smtp_port'  => 465,            // 465 = SSL, 587 = TLS
        'smtp_user'  => 'books@yourdomain.com',
        'smtp_pass'  => 'YOUR_EMAIL_PASSWORD',
        // PDFs larger than this are sent as a secure download link only.
        'max_attachment_mb' => 10,
    ],

    // Set true while testing on http://localhost
    'dev' => false,
];
