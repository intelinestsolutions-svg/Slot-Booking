<?php
// ====== Penghantaran OTP melalui EMAIL (saluran selain SMS) ======
// PERCUMA: menggunakan mail() pelayan hosting sendiri. Tiada gateway,
// tiada SIM, tiada kos se mesej. Aktifkan dengan OTP_CHANNEL=email.

require_once __DIR__ . '/db.php';

function otp_mail_from(): string
{
    $host = parse_url(defined('SITE_URL') ? (string)SITE_URL : '', PHP_URL_HOST);
    if (!is_string($host) || $host === '') {
        $host = 'sabahbuskers.my';
    }
    return 'noreply@' . $host;
}

function otp_mask_email(string $email): string
{
    $parts = explode('@', $email);
    if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
        return '••••';
    }
    $u = $parts[0];
    $show = max(1, min(2, strlen($u)));
    return substr($u, 0, $show) . '***@' . $parts[1];
}

function otp_email_body(string $otp, int $ttlMin): string
{
    return "Kod pengesahan SBC anda: $otp\n\n"
        . "Kod ini luput dalam $ttlMin minit. Jangan kongsi dengan sesiapa.\n\n"
        . "--\nSabah Buskers Community (SBC)";
}

function send_email_otp(string $email, string $otp): array
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'error' => 'Email tidak sah.'];
    }
    $ttlMin = (int)((defined('OTP_TTL') ? OTP_TTL : 600) / 60);
    $subject = 'Kod pengesahan SBC: ' . $otp;
    $body = otp_email_body($otp, $ttlMin);

    $testLog = defined('EMAIL_TEST_LOG') ? (string)EMAIL_TEST_LOG : '';
    if ($testLog !== '') {
        $dir = dirname($testLog);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        file_put_contents(
            $testLog,
            date('Y-m-d H:i:s') . " TO=$email OTP=$otp\n",
            FILE_APPEND | LOCK_EX
        );
        return ['success' => true, 'test' => true];
    }

    $headers = 'From: Sabah Buskers Community <' . otp_mail_from() . ">\r\n"
        . "Reply-To: info@sabahbuskers.my\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "X-Mailer: SBC-Booking\r\n";
    $ok = @mail($email, $subject, $body, $headers);
    if (!$ok) {
        return ['success' => false, 'error' => 'Gagal menghantar email. Sila cuba lagi.'];
    }
    return ['success' => true];
}

function otp_channel(): string
{
    $c = strtolower((string)(defined('OTP_CHANNEL') ? OTP_CHANNEL : 'sms'));
    return $c === 'email' ? 'email' : 'sms';
}

/**
 * Hantar OTP mengikut saluran aktif. Pulangan sentiasa membawa
 * 'channel' + 'sentTo' untuk paparan UI yang tepat.
 */
function otp_deliver(string $email, string $phone, string $otp): array
{
    if (otp_channel() === 'email') {
        $r = send_email_otp($email, $otp);
        return [
            'success' => !empty($r['success']),
            'error' => $r['error'] ?? '',
            'channel' => 'email',
            'sentTo' => 'email anda (' . otp_mask_email($email) . ')',
            'emailMasked' => otp_mask_email($email),
        ];
    }
    if (!otp_configured()) {
        return ['success' => false, 'error' => 'Perkhidmatan SMS belum disediakan. Sila hubungi admin.'];
    }
    $ttlMin = (int)((defined('OTP_TTL') ? OTP_TTL : 600) / 60);
    $msg = "🔐 Kod pengesahan SBC: $otp\nKod ini luput dalam $ttlMin minit. Jangan kongsi dengan sesiapa.";
    $ok = send_whatsapp($phone, $msg);
    return [
        'success' => (bool)$ok,
        'error' => $ok ? '' : 'Gagal menghantar kod SMS. Sila cuba hantar semula.',
        'channel' => 'sms',
        'sentTo' => 'SMS ke ' . otp_mask($phone),
        'phoneMasked' => otp_mask($phone),
    ];
}
