<?php
// ====== Alert admin melalui EMAIL — PERCUMA, tiada gateway ======
// Digunakan untuk makluman yang WAJIB sampai: pembayaran berjaya.
//
// Bina atas corak mail() yang sama seperti email_otp.php (yang sudah
// terbukti berfungsi untuk OTP), jadi tiada infrastruktur baharu.
//
// Matlamat: selepas bertukar ke email, TIDAK LAGI ada laluan yang
// "hantar" gagal secara senyap. Setiap kegagalan ditulis ke log.

require_once __DIR__ . '/db.php';

/** Fail log untuk alert yang gagal dihantar. Kos sifar. */
function alert_log_path(): string
{
    $dir = defined('DATA_DIR') ? (string)DATA_DIR : (DB_DIR . '/logs');
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir . '/alerts.log';
}

/** Catat ke dalam log alert (fail) DAN error_log (log pelayan). */
function alert_log(string $level, string $detail): void
{
    $line = date('Y-m-d H:i:s') . " [$level] $detail";
    @file_put_contents(alert_log_path(), $line . "\n", FILE_APPEND | LOCK_EX);
    error_log('[SBC alert] ' . $detail);
}

/** Alamat penerima alert admin. */
function alert_admin_address(): string
{
    return defined('DEFAULT_ADMIN_EMAIL') ? (string)DEFAULT_ADMIN_EMAIL : 'admin@sabahbuskers.my';
}

function alert_mail_from(): string
{
    $host = parse_url(defined('SITE_URL') ? (string)SITE_URL : '', PHP_URL_HOST);
    if (!is_string($host) || $host === '') {
        $host = 'sabahbuskers.my';
    }
    return 'noreply@' . $host;
}

/**
 * Hantar satu alert kepada admin melalui email.
 *
 * Berbalut dengan EMAIL_TEST_LOG supaya ia boleh diuji tanpa menghantar
 * email sebenar, seperti email_otp.php.
 *
 * @return bool true hanya jika enqueue berjaya.
 */
function send_admin_alert(string $subject, string $body): bool
{
    $to = alert_admin_address();
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        alert_log('ERROR', 'alamat admin tidak sah: ' . $to);
        return false;
    }

    // Subjek ASCII sahaja — mail() tidak mengekodkan subjek UTF-8 dengan
    // konsisten, dan emoji tidak menambah apa-apa. Dilucutkan SEBELUM
    // cabang ujian supaya output ujian mencerminkan apa yang benar-benar
    // dihantar.
    $subject = trim(preg_replace('/[^\x20-\x7E]/', '', $subject) ?: 'Alert');
    if ($subject === '') {
        $subject = 'Alert';
    }

    // Mod ujian: log sahaja, jangan hantar ke peti sebenar.
    $testLog = defined('EMAIL_TEST_LOG') ? (string)EMAIL_TEST_LOG : '';
    if ($testLog !== '') {
        $dir = dirname($testLog);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        @file_put_contents(
            $testLog,
            date('Y-m-d H:i:s') . " TO=$to SUBJ=$subject\n" . str_replace("\n", ' | ', $body) . "\n",
            FILE_APPEND | LOCK_EX
        );
        return true;
    }

    $body = str_replace("\r\n", "\n", $body);

    $headers = 'From: Sabah Buskers Community <' . alert_mail_from() . ">\r\n"
        . 'Reply-To: ' . $to . "\r\n"
        . 'Content-Type: text/plain; charset=UTF-8' . "\r\n"
        . 'X-Mailer: SBC-Alert' . "\r\n";

    $ok = @mail($to, '[SBC] ' . $subject, $body, $headers);
    if (!$ok) {
        // Kegagalan menghantar secara senyap adalah punca isu ini sejak
        // dahulu — pastikan ia tidak boleh berlaku lagi tanpa jejak.
        alert_log('ERROR', 'mail() gagal untuk ' . $to . ' :: ' . $subject);
    }
    return (bool)$ok;
}