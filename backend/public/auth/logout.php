<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/** POST /api/auth/logout.php */
require_post();
logout_user();
json_success('Signed out');
