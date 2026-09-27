<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/** GET /api/users/profile.php — the signed-in member's own profile. */
allow_methods('GET');
$user = require_auth();
json_success('Profile', ['user' => public_user($user)]);
