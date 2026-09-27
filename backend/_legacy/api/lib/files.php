<?php
declare(strict_types=1);

/* Private PDF storage (outside public_html) and signed download links. */

function book_pdf_path(array $book): ?string
{
    $file = basename((string) ($book['pdf_file'] ?? ''));   // basename() blocks ../ tricks
    if ($file === '') {
        return null;
    }
    $path = rtrim((string) config('storage_dir'), '/') . '/books/' . $file;
    return is_file($path) && is_readable($path) ? $path : null;
}

function safe_filename(string $title): string
{
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $title) ?? 'ebook', '-'));
    return ($slug !== '' ? $slug : 'ebook') . '.pdf';
}

/** Streams a PDF to the browser. $inline = true to read in the browser, false to download. */
function stream_pdf(string $path, string $title, bool $inline): void
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    $name = safe_filename($title);
    header_remove('Content-Type');
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($path));
    header(sprintf('Content-Disposition: %s; filename="%s"', $inline ? 'inline' : 'attachment', $name));
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex');
    readfile($path);
    exit;
}

/* ── Signed, expiring download links for emails ── */

function b64url(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function b64url_decode(string $s): string
{
    return (string) base64_decode(strtr($s, '-_', '+/'));
}

function make_download_token(string $orderRef, string $bookId, int $ttlSeconds = 604800): string
{
    $payload = b64url(json_encode(['o' => $orderRef, 'b' => $bookId, 'e' => time() + $ttlSeconds]));
    $sig = b64url(hash_hmac('sha256', $payload, (string) config('app_secret'), true));
    return $payload . '.' . $sig;
}

/** @return array{o:string,b:string,e:int}|null */
function read_download_token(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }
    [$payload, $sig] = $parts;
    $expected = b64url(hash_hmac('sha256', $payload, (string) config('app_secret'), true));
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $data = json_decode(b64url_decode($payload), true);
    if (!is_array($data) || !isset($data['o'], $data['b'], $data['e']) || (int) $data['e'] < time()) {
        return null;
    }
    return $data;
}
