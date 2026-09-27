<?php
declare(strict_types=1);
require __DIR__ . '/../bootstrap.php';

require_method('POST');
require_same_origin();
logout_user();
json_ok(['done' => true]);
