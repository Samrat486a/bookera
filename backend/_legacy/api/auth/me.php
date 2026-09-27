<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';

$user = current_user();
json_ok(['user' => $user ? public_user($user) : null]);
