<?php
declare(strict_types=1);

/*
 * Outgoing email.
 *
 *  • Local (mail.log_only = true): nothing is sent — each email is appended to
 *    storage/logs/mail.log so you can open links (e.g. password reset) yourself.
 *  • Production: sent through your Hostinger mailbox via SMTP with PHPMailer
 *    (installed with Composer in a later phase), or PHP mail() as a fallback.
 */

function send_mail(string $toEmail, string $toName, string $subject, string $html, string $text): bool
{
    if (config('mail.log_only', false)) {
        $entry = sprintf(
            "==== %s UTC ====\nTo: %s <%s>\nSubject: %s\n\n%s\n\n",
            gmdate('Y-m-d H:i:s'), $toName, $toEmail, $subject, $text
        );
        return @file_put_contents(storage_path('logs/mail.log'), $entry, FILE_APPEND | LOCK_EX) !== false;
    }

    $autoload = APP_DIR . '/vendor/autoload.php';
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
            $mail->SMTPSecure = $mail->Port === 465 ? 'ssl' : 'tls';
            $mail->CharSet = 'UTF-8';
            $mail->setFrom((string) config('mail.from_email'), (string) config('mail.from_name', 'Bookera'));
            $mail->addAddress($toEmail, $toName);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = $html;
            $mail->AltBody = $text;
            return $mail->send();
        }

        $boundary = 'b_' . bin2hex(random_bytes(8));
        $from = (string) config('mail.from_email');
        $headers = implode("\r\n", [
            'MIME-Version: 1.0',
            'From: ' . mb_encode_mimeheader((string) config('mail.from_name', 'Bookera')) . " <{$from}>",
            "Content-Type: multipart/alternative; boundary=\"{$boundary}\"",
        ]);
        $body = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n{$text}\r\n"
            . "--{$boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{$html}\r\n--{$boundary}--";
        return mail($toEmail, mb_encode_mimeheader($subject), $body, $headers, '-f' . $from);
    } catch (Throwable $e) {
        log_error('Email to ' . $toEmail . ' failed: ' . $e->getMessage());
        return false;
    }
}

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/** Branded wrapper used by every email. */
function email_layout(string $heading, string $bodyHtml, ?string $buttonText = null, ?string $buttonUrl = null): string
{
    $button = $buttonText && $buttonUrl
        ? '<p style="margin:28px 0"><a href="' . e($buttonUrl) . '" style="background:#3654FF;color:#fff;text-decoration:none;font-weight:600;padding:13px 24px;border-radius:999px;display:inline-block">' . e($buttonText) . '</a></p>'
        : '';
    return '<!doctype html><html><body style="margin:0;background:#F6F4EE;font-family:Inter,Segoe UI,Arial,sans-serif;color:#14171B">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">'
        . '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #E4E0D5;border-radius:24px">'
        . '<tr><td style="padding:28px 32px 0;font-size:22px;font-weight:700">bookera<span style="color:#FFAE1F">.</span></td></tr>'
        . '<tr><td style="padding:20px 32px 28px;font-size:15px;line-height:1.6;color:#3B4048">'
        . '<h1 style="margin:0 0 12px;font-size:24px;color:#14171B">' . e($heading) . '</h1>' . $bodyHtml . $button
        . '</td></tr></table><p style="font-size:12px;color:#6B7079">© Bookera · Discover. Read. Learn.</p></td></tr></table></body></html>';
}
