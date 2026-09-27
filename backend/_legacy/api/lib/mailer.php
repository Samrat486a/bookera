<?php
declare(strict_types=1);

/*
 * Sends the "your e-book is here" email.
 * Uses PHPMailer over SMTP when installed (recommended — run `composer install` in /api),
 * otherwise falls back to PHP's mail(), which Hostinger also supports.
 */

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function book_email_html(array $user, array $book, array $order, string $downloadUrl, bool $attached): string
{
    $app = rtrim((string) config('app_url'), '/');
    $amount = (int) $order['amount_paise'] > 0 ? '₹' . number_format(((int) $order['amount_paise']) / 100, 0) : 'Free';
    $first = h(explode(' ', $user['name'])[0]);
    $title = h($book['title']);
    $author = h($book['author_name']);
    $readUrl = h($app . '/read/' . rawurlencode($book['id']));
    $libraryUrl = h($app . '/dashboard');
    $dl = h($downloadUrl);
    $ref = h($order['ref']);
    $attachLine = $attached ? 'Your PDF is attached to this email.' : 'Download your PDF with the button below.';

    return <<<HTML
<!doctype html>
<html><body style="margin:0;background:#F6F4EE;font-family:Inter,Segoe UI,Arial,sans-serif;color:#14171B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4EE;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E4E0D5;border-radius:24px;overflow:hidden">
        <tr><td style="padding:28px 32px 0">
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px">bookera<span style="color:#FFAE1F">.</span></div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px">
          <p style="margin:0 0 6px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#3654FF;font-weight:600">Your e-book is ready</p>
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2">Happy reading, {$first}! 📚</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#3B4048">
            Thanks for your purchase. <b>{$title}</b> by {$author} is now in your Bookera library. {$attachLine}
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px">
          <a href="{$readUrl}" style="display:inline-block;background:#3654FF;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:999px;font-size:14px">Read online</a>
          &nbsp;
          <a href="{$dl}" style="display:inline-block;background:#14171B;color:#F6F4EE;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:999px;font-size:14px">Download PDF</a>
        </td></tr>
        <tr><td style="padding:0 32px 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4EE;border-radius:16px;font-size:14px">
            <tr><td style="padding:14px 16px;color:#6B7079">Order</td><td style="padding:14px 16px;text-align:right;font-weight:600">{$ref}</td></tr>
            <tr><td style="padding:0 16px 14px;color:#6B7079">Paid</td><td style="padding:0 16px 14px;text-align:right;font-weight:600">{$amount}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 28px;font-size:13px;line-height:1.6;color:#6B7079">
          Your library is always at <a href="{$libraryUrl}" style="color:#3654FF">{$libraryUrl}</a> — sign in with this email address.
          The download link above works for 7 days.
        </td></tr>
      </table>
      <p style="font-size:12px;color:#6B7079;margin:16px 0 0">© Bookera · Discover. Read. Learn.</p>
    </td></tr>
  </table>
</body></html>
HTML;
}

/**
 * @return bool true if the email was handed to the mail server
 */
function send_book_email(array $user, array $book, array $order): bool
{
    $app = rtrim((string) config('app_url'), '/');
    $downloadUrl = $app . '/api/download.php?t=' . rawurlencode(make_download_token($order['ref'], $book['id']));
    $pdf = book_pdf_path($book);
    $maxBytes = (int) config('mail.max_attachment_mb', 10) * 1024 * 1024;
    $attach = $pdf !== null && filesize($pdf) <= $maxBytes;

    $subject = 'Your e-book: ' . $book['title'];
    $html = book_email_html($user, $book, $order, $downloadUrl, $attach);
    $text = "Hi {$user['name']},\n\nThanks for your purchase! \"{$book['title']}\" is now in your Bookera library.\n\n"
        . "Read online: {$app}/read/{$book['id']}\nDownload PDF (7 days): {$downloadUrl}\nOrder: {$order['ref']}\n\nHappy reading,\nBookera";

    $autoload = __DIR__ . '/../vendor/autoload.php';
    try {
        if (is_file($autoload)) {
            require_once $autoload;
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = (string) config('mail.smtp_host');
            $mail->Port = (int) config('mail.smtp_port', 465);
            $mail->SMTPAuth = true;
            $mail->Username = (string) config('mail.smtp_user');
            $mail->Password = (string) config('mail.smtp_pass');
            $mail->SMTPSecure = $mail->Port === 465 ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->CharSet = 'UTF-8';
            $mail->setFrom((string) config('mail.from_email'), (string) config('mail.from_name', 'Bookera'));
            $mail->addAddress($user['email'], $user['name']);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = $html;
            $mail->AltBody = $text;
            if ($attach) {
                $mail->addAttachment($pdf, safe_filename($book['title']), 'base64', 'application/pdf');
            }
            return $mail->send();
        }
        return send_with_php_mail($user['email'], $subject, $html, $text, $attach ? $pdf : null, safe_filename($book['title']));
    } catch (Throwable $e) {
        error_log('[bookera] email failed for order ' . $order['ref'] . ': ' . $e->getMessage());
        return false;
    }
}

/** Fallback multipart email via mail(). */
function send_with_php_mail(string $to, string $subject, string $html, string $text, ?string $pdfPath, string $pdfName): bool
{
    $from = (string) config('mail.from_email');
    $fromName = (string) config('mail.from_name', 'Bookera');
    $mixed = 'mix_' . bin2hex(random_bytes(8));
    $alt = 'alt_' . bin2hex(random_bytes(8));

    $headers = [
        'MIME-Version: 1.0',
        'From: ' . mb_encode_mimeheader($fromName) . " <{$from}>",
        "Reply-To: {$from}",
        "Content-Type: multipart/mixed; boundary=\"{$mixed}\"",
    ];

    $body = "--{$mixed}\r\nContent-Type: multipart/alternative; boundary=\"{$alt}\"\r\n\r\n"
        . "--{$alt}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "\r\n"
        . "--{$alt}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "\r\n"
        . "--{$alt}--\r\n";

    if ($pdfPath !== null) {
        $body .= "--{$mixed}\r\nContent-Type: application/pdf; name=\"{$pdfName}\"\r\nContent-Transfer-Encoding: base64\r\n"
            . "Content-Disposition: attachment; filename=\"{$pdfName}\"\r\n\r\n" . chunk_split(base64_encode((string) file_get_contents($pdfPath))) . "\r\n";
    }
    $body .= "--{$mixed}--";

    return mail($to, mb_encode_mimeheader($subject), $body, implode("\r\n", $headers), '-f' . $from);
}
