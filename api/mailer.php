<?php
// ====== Emel generik kepada pengguna (busker) — PERCUMA, mail() ======
// Corak yang sama seperti email_otp.php (terbukti berfungsi untuk OTP):
// mail() pelayan hosting sendiri, tiada gateway, tiada kos.
// Digunakan untuk makluman tempahan: diluluskan (pautan bayaran) / ditolak.

require_once __DIR__ . '/db.php';

/** Fail log emel yang gagal dihantar. */
function mailer_log_path(): string
{
    $dir = defined('DATA_DIR') ? (string)DATA_DIR : (DB_DIR . '/logs');
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir . '/mailer.log';
}

/** Catat ke dalam log emel (fail) DAN error_log (log pelayan). */
function mailer_log(string $level, string $detail): void
{
    $line = date('Y-m-d H:i:s') . " [$level] $detail";
    @file_put_contents(mailer_log_path(), $line . "\n", FILE_APPEND | LOCK_EX);
    error_log('[SBC mailer] ' . $detail);
}

function mailer_from(): string
{
    $host = parse_url(defined('SITE_URL') ? (string)SITE_URL : '', PHP_URL_HOST);
    if (!is_string($host) || $host === '') {
        $host = 'sabahbuskers.my';
    }
    return 'noreply@' . $host;
}

/**
 * Hantar emel ringkas kepada satu alamat.
 *
 * Berbalut dengan EMAIL_TEST_LOG supaya boleh diuji tanpa menghantar emel
 * sebenar, sama seperti email_otp.php / alert_email.php.
 *
 * @return array ['success' => bool, 'error' => string, 'test' => bool]
 */
function send_user_email(string $to, string $subject, string $body): array
{
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'error' => 'Emel penerima tidak sah.'];
    }

    // Subjek ASCII sahaja — mail() tidak mengekodkan subjek UTF-8 dengan
    // konsisten. Kandungan emel tetap UTF-8 (Content-Type di bawah).
    $subject = trim(preg_replace('/[^\x20-\x7E]/', '', $subject) ?: '');
    if ($subject === '') {
        $subject = 'Makluman SBC';
    }

    // Mod ujian: log sahaja, jangan hantar emel sebenar.
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
        return ['success' => true, 'test' => true];
    }

    $headers = 'From: Sabah Buskers Community <' . mailer_from() . ">\r\n"
        . "Reply-To: info@sabahbuskers.my\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "X-Mailer: SBC-Booking\r\n";
    $ok = @mail($to, $subject, $body, $headers);
    if (!$ok) {
        mailer_log('ERROR', 'mail() gagal ke ' . $to . ' :: ' . $subject);
        return ['success' => false, 'error' => 'Gagal menghantar emel kepada ' . $to . '.'];
    }
    return ['success' => true];
}

/**
 * Emel "tempahan diluluskan" bersama pautan pembayaran ToyyibPay.
 * $b perlu mempunyai: email, stageName, locationName, date, startTime, endTime, price.
 */
function booking_approval_email(array $b, string $billCode): array
{
    $paymentUrl = (defined('TOYYIBPAY_GATEWAY') ? TOYYIBPAY_GATEWAY : 'https://toyyibpay.com/') . $billCode;
    $to = (string)($b['email'] ?? '');
    $stage = (string)($b['stageName'] ?? 'Busker');
    $loc = (string)($b['locationName'] ?? '');

    $subject = 'Tempahan Diluluskan - Sila Bayar (SBC)';
    $body = "ASSALAMUALAIKUM / HAI " . strtoupper($stage) . ",\n\n"
        . "Tempahan slot anda telah DILULUSKAN oleh admin.\n\n"
        . "Lokasi : {$loc}\n"
        . "Tarikh : " . ($b['date'] ?? '-') . "\n"
        . "Masa   : " . ($b['startTime'] ?? '-') . " - " . ($b['endTime'] ?? '-') . "\n"
        . "Yuran  : RM" . number_format((float)($b['price'] ?? 0), 2) . "\n\n"
        . "Sila lengkapkan pembayaran melalui pautan ini:\n{$paymentUrl}\n\n"
        . "Slot akan disahkan sebaik sahaja pembayaran berjaya.\n\n"
        . "Urusan tempahan anda: " . SITE_URL . "/?page=tempahan-saya\n\n"
        . "Jika anda tidak membuat tempahan ini, sila abaikan emel ini.\n\n"
        . "--\nSabah Buskers Community (SBC)";

    return send_user_email($to, $subject, $body);
}

/**
 * Emel "tempahan ditolak" — slot dilepaskan, tiada pembayaran diperlukan.
 * $b perlu mempunyai: email, stageName, locationName, date, startTime, endTime.
 */
function booking_reject_email(array $b): array
{
    $to = (string)($b['email'] ?? '');
    $stage = (string)($b['stageName'] ?? 'Busker');
    $loc = (string)($b['locationName'] ?? '');

    $subject = 'Tempahan Ditolak (SBC)';
    $body = "ASSALAMUALAIKUM / HAI " . strtoupper($stage) . ",\n\n"
        . "Kami tidak dapat meluluskan tempahan slot anda:\n\n"
        . "Lokasi : {$loc}\n"
        . "Tarikh : " . ($b['date'] ?? '-') . "\n"
        . "Masa   : " . ($b['startTime'] ?? '-') . " - " . ($b['endTime'] ?? '-') . "\n\n"
        . "Slot tersebut telah dilepaskan. Anda boleh mencuba slot lain:\n"
        . SITE_URL . "/?page=cari-slot\n\n"
        . "Untuk sebarang pertanyaan, sila hubungi pentadbir.\n\n"
        . "--\nSabah Buskers Community (SBC)";

    return send_user_email($to, $subject, $body);
}