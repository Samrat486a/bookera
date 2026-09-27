<?php
declare(strict_types=1);

/*
 * Secure file uploads.
 *
 *  Covers   → PUBLIC  api/uploads/covers/<random>.jpg|webp
 *             Validated as a real image, then re-drawn with GD. Re-encoding strips
 *             anything hidden inside the file (scripts, metadata, polyglots).
 *  E-books  → PRIVATE app/storage/books/<random>.pdf|epub
 *             Validated by content (magic bytes), never by the file name.
 *             Only reachable through the protected download endpoint (Phase 10).
 */

const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_MAX_WIDTH = 1200;
const EBOOK_MAX_BYTES = 100 * 1024 * 1024;

/** Returns the uploaded file array for $field or fails with a clear message. */
function uploaded_file(string $field): array
{
    // A body larger than post_max_size arrives as an empty request.
    $postMax = ini_bytes((string) ini_get('post_max_size'));
    if (empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $postMax && $postMax > 0) {
        json_error('That file is too large for the server (limit ' . ini_get('post_max_size') . ').', 413, [$field => 'File too large.'], 'FILE_TOO_LARGE');
    }
    $f = $_FILES[$field] ?? null;
    if (!is_array($f) || is_array($f['error'] ?? null)) {
        json_error('Please choose a file to upload.', 422, [$field => 'No file received.'], 'NO_FILE');
    }
    switch ($f['error']) {
        case UPLOAD_ERR_OK:
            break;
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            json_error('That file is too large (server limit ' . ini_get('upload_max_filesize') . ').', 413, [$field => 'File too large.'], 'FILE_TOO_LARGE');
        case UPLOAD_ERR_NO_FILE:
            json_error('Please choose a file to upload.', 422, [$field => 'No file received.'], 'NO_FILE');
        default:
            log_error('Upload error code ' . $f['error']);
            json_error('The upload didn’t complete. Please try again.', 400, [$field => 'Upload failed.'], 'UPLOAD_FAILED');
    }
    if (!is_uploaded_file($f['tmp_name'])) {
        json_error('Invalid upload.', 400, [], 'UPLOAD_FAILED');
    }
    return $f;
}

function ini_bytes(string $v): int
{
    $n = (int) $v;
    switch (strtolower(substr(trim($v), -1))) {
        case 'g': return $n * 1024 ** 3;
        case 'm': return $n * 1024 ** 2;
        case 'k': return $n * 1024;
        default:  return $n;
    }
}

function random_name(string $ext): string
{
    return bin2hex(random_bytes(16)) . '.' . $ext;
}

function public_upload_dir(string $sub): string
{
    $dir = PUBLIC_DIR . '/uploads/' . $sub;
    if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
        throw new RuntimeException("Can't create upload folder $dir");
    }
    return $dir;
}

/**
 * Validates and re-encodes a cover image. Returns the path relative to the
 * public API folder, e.g. "uploads/covers/9f…c1.jpg".
 */
function store_cover(array $file): string
{
    if ($file['size'] > COVER_MAX_BYTES) {
        json_error('Cover images must be under 5 MB.', 413, ['cover' => 'Image too large (max 5 MB).'], 'FILE_TOO_LARGE');
    }
    $info = @getimagesize($file['tmp_name']);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $allowed = ['image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng', 'image/webp' => 'imagecreatefromwebp'];
    if (!$info || !isset($allowed[$mime]) || $info['mime'] !== $mime || !function_exists($allowed[$mime])) {
        json_error('Please upload a JPG, PNG or WebP image.', 415, ['cover' => 'Unsupported image type.'], 'UNSUPPORTED_TYPE');
    }
    [$w, $h] = $info;
    if ($w < 200 || $h < 200 || $w > 8000 || $h > 8000) {
        json_error('Cover images must be between 200 and 8000 pixels on each side.', 422, ['cover' => 'Image dimensions not allowed.'], 'BAD_DIMENSIONS');
    }

    $src = @$allowed[$mime]($file['tmp_name']);
    if (!$src) {
        json_error('That image couldn’t be read. Please try another file.', 422, ['cover' => 'Unreadable image.'], 'BAD_IMAGE');
    }
    $newW = min($w, COVER_MAX_WIDTH);
    $newH = (int) round($h * $newW / $w);
    $dst = imagecreatetruecolor($newW, $newH);
    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));   // flatten transparency onto white
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);

    $useWebp = function_exists('imagewebp');
    $name = random_name($useWebp ? 'webp' : 'jpg');
    $path = public_upload_dir('covers') . '/' . $name;
    $ok = $useWebp ? imagewebp($dst, $path, 85) : imagejpeg($dst, $path, 86);
    imagedestroy($src);
    imagedestroy($dst);
    if (!$ok) {
        throw new RuntimeException('Failed to write cover image');
    }
    @chmod($path, 0644);
    return 'uploads/covers/' . $name;
}

/**
 * Validates an e-book by its content and moves it into private storage.
 * @return array{path:string,size:int,mime:string,format:string}
 */
function store_ebook(array $file): array
{
    if ($file['size'] > EBOOK_MAX_BYTES) {
        json_error('E-book files must be under 100 MB.', 413, ['file' => 'File too large (max 100 MB).'], 'FILE_TOO_LARGE');
    }
    $head = (string) file_get_contents($file['tmp_name'], false, null, 0, 64);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);

    if (str_starts_with($head, '%PDF-')) {
        $format = 'pdf';
        $mime = 'application/pdf';
    } elseif (str_starts_with($head, "PK\x03\x04") && substr($head, 30, 28) === 'mimetypeapplication/epub+zip') {
        $format = 'epub';
        $mime = 'application/epub+zip';
    } else {
        json_error('Please upload a PDF or EPUB file.', 415, ['file' => 'Only PDF and EPUB files are accepted (detected: ' . $mime . ').'], 'UNSUPPORTED_TYPE');
    }

    $dir = storage_path('books');
    if (!is_dir($dir) && !@mkdir($dir, 0770, true)) {
        throw new RuntimeException("Can't create storage folder $dir");
    }
    $name = random_name($format);
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
        throw new RuntimeException('Failed to store e-book file');
    }
    @chmod($dir . '/' . $name, 0640);
    return ['path' => $name, 'size' => (int) $file['size'], 'mime' => $mime, 'format' => $format];
}

/** Deletes a previously stored file (used when an admin replaces it). */
function delete_stored_file(?string $relative, bool $public): void
{
    if (!$relative) {
        return;
    }
    $path = $public ? PUBLIC_DIR . '/' . ltrim($relative, '/') : storage_path('books/' . basename($relative));
    // Only ever delete inside our own upload/storage folders.
    $root = realpath($public ? PUBLIC_DIR . '/uploads' : storage_path('books'));
    $real = realpath($path);
    if ($root && $real && str_starts_with($real, $root . DIRECTORY_SEPARATOR) && is_file($real)) {
        @unlink($real);
    }
}
