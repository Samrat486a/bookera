<?php
declare(strict_types=1);

/*
 * Input validation. Each validator returns the cleaned value, or null and
 * records a friendly message in $errors[field]. Endpoints then call
 * fail_if_errors($errors) to answer 422 with all field messages at once.
 */

function input_string(array $src, string $key): string
{
    $v = $src[$key] ?? '';
    return is_scalar($v) ? trim((string) $v) : '';
}

function v_name(string $value, array &$errors, string $field = 'name'): ?string
{
    $name = preg_replace('/\s+/u', ' ', $value) ?? '';
    $len = mb_strlen($name);
    if ($len < 2 || $len > 120) {
        $errors[$field] = 'Please enter your full name (2–120 characters).';
        return null;
    }
    if (preg_match('/[<>{}\x00-\x1F]/u', $name)) {
        $errors[$field] = 'Your name contains characters that aren’t allowed.';
        return null;
    }
    return $name;
}

function v_email(string $value, array &$errors, string $field = 'email'): ?string
{
    $email = mb_strtolower($value);
    if ($email === '' || strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[$field] = 'Please enter a valid email address.';
        return null;
    }
    return $email;
}

/** Accepts Indian and international numbers: keeps digits and a leading +; 10–15 digits. */
function v_phone(string $value, array &$errors, bool $required = true, string $field = 'phone'): ?string
{
    if ($value === '') {
        if ($required) {
            $errors[$field] = 'Please enter your phone number.';
        }
        return null;
    }
    $plus = str_starts_with($value, '+') ? '+' : '';
    $digits = preg_replace('/\D+/', '', $value) ?? '';
    if (!preg_match('/^[\d\s()+.-]+$/', $value) || strlen($digits) < 10 || strlen($digits) > 15) {
        $errors[$field] = 'Please enter a valid phone number (10–15 digits).';
        return null;
    }
    return $plus . $digits;
}

const COMMON_PASSWORDS = [
    'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop',
    '11111111', '00000000', 'iloveyou', 'abc12345', 'admin123', 'welcome1', 'letmein1', 'bookera123', 'passw0rd',
];

function v_password(string $value, array &$errors, string $field = 'password'): ?string
{
    $len = strlen($value);
    if ($len < 8) {
        $errors[$field] = 'Use at least 8 characters.';
        return null;
    }
    if ($len > 128) {
        $errors[$field] = 'Password is too long (max 128 characters).';
        return null;
    }
    if (in_array(mb_strtolower($value), COMMON_PASSWORDS, true) || preg_match('/^(.)\1+$/', $value)) {
        $errors[$field] = 'That password is too easy to guess — try something less common.';
        return null;
    }
    return $value;
}

function fail_if_errors(array $errors, string $message = 'Please check the highlighted fields.'): void
{
    if ($errors) {
        json_error($message, 422, $errors, 'VALIDATION_FAILED');
    }
}
