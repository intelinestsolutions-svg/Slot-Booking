<?php
// ====== OTP SMS — pengesahan nombor & tetapan semula kata laluan ======
// Digunakan oleh api/auth.php (pendaftaran, pengesahan, lupa kata laluan).
// Penghantaran melalui send_whatsapp() (chatapi | evolution).

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/whatsapp.php';

function otp_mask(string $phone): string
{
    $p = preg_replace('/[^0-9]/', '', $phone);
    if (strlen($p) < 4) {
        return '••••';
    }
    return '•••• ••• ' . substr($p, -4);
}

/**
 * OTP disimpan sebagai cap masa UNIX (int) — tidak terjejas oleh perbezaan
 * zon masa antara SQLite (UTC) dan PHP (Asia/Kuching).
 */
function otp_ts($v): int
{
    if ($v === null || $v === '') {
        return 0;
    }
    if (is_numeric($v)) {
        return (int)$v;
    }
    $t = strtotime((string)$v);
    return $t === false ? 0 : $t;
}

function otp_configured(): bool
{
    if (defined('SMS_TEST_MODE') && SMS_TEST_MODE) {
        return true;
    }
    $gateway = defined('SMS_GATEWAY') ? (string)SMS_GATEWAY : '';
    if ($gateway === 'sms') {
        $user = defined('SMS_USER') ? (string)SMS_USER : '';
        $pass = defined('SMS_PASS') ? (string)SMS_PASS : '';
        return $user !== '' && $pass !== '';
    }
    $token = defined('SMS_TOKEN') ? (string)SMS_TOKEN : '';
    $instance = defined('SMS_INSTANCE_ID') ? (string)SMS_INSTANCE_ID : '';
    return $gateway !== '' && $token !== '' && $instance !== '';
}

function otp_message(string $otp): string
{
    $mins = (int)((defined('OTP_TTL') ? OTP_TTL : 600) / 60);
    return "🔐 Kod pengesahan SBC: $otp\n"
        . "Kod ini luput dalam $mins minit. Jangan kongsi dengan sesiapa.";
}

/**
 * Jana OTP 6-digit, simpan hash + luput, hantar mengikut saluran aktif
 * (email atau SMS). Pulangan membawa 'channel' + 'sentTo' untuk UI.
 * @return array{success:bool,error?:string,channel?:string,sentTo?:string}
 */
function otp_issue(PDO $pdo, int $userId, string $email, string $phone): array
{
    $otp = (string)random_int(100000, 999999);
    $expires = time() + (defined('OTP_TTL') ? OTP_TTL : 600);
    $pdo->prepare("UPDATE users SET phoneOtpHash = ?, phoneOtpExpires = ?, phoneOtpAttempts = 0, phoneOtpSentAt = ? WHERE id = ?")
        ->execute([password_hash($otp, PASSWORD_DEFAULT), (string)$expires, (string)time(), $userId]);
    require_once __DIR__ . '/email_otp.php';
    return otp_deliver($email, $phone, $otp);
}

/**
 * Semak OTP terhadap rekod pengguna.
 * @return array{success:bool,error?:string,code?:int}
 */
function otp_check(PDO $pdo, array $user, string $code): array
{
    $code = preg_replace('/[^0-9]/', '', $code);
    if ($code === '' || empty($user['phoneOtpHash']) || empty($user['phoneOtpExpires'])) {
        return ['success' => false, 'error' => 'Tiada kod aktif. Sila minta kod baharu.', 'code' => 410];
    }
    if (otp_ts($user['phoneOtpExpires'] ?? null) < time()) {
        return ['success' => false, 'error' => 'Kod pengesahan telah luput. Sila minta kod baharu.', 'code' => 410];
    }
    $max = defined('OTP_MAX_ATTEMPTS') ? OTP_MAX_ATTEMPTS : 5;
    if ((int)($user['phoneOtpAttempts'] ?? 0) >= $max) {
        return ['success' => false, 'error' => 'Terlalu banyak cubaan salah. Sila minta kod baharu.', 'code' => 429];
    }
    if (!password_verify($code, $user['phoneOtpHash'])) {
        $pdo->prepare("UPDATE users SET phoneOtpAttempts = phoneOtpAttempts + 1 WHERE id = ?")
            ->execute([$user['id']]);
        return ['success' => false, 'error' => 'Kod pengesahan salah. Sila cuba lagi.', 'code' => 401];
    }
    return ['success' => true];
}

function otp_cooldown_wait($sentAt): int
{
    $cooldown = defined('OTP_RESEND_COOLDOWN') ? OTP_RESEND_COOLDOWN : 60;
    $ts = otp_ts($sentAt);
    if ($ts <= 0) {
        return 0;
    }
    $wait = $cooldown - (time() - $ts);
    return $wait > 0 ? $wait : 0;
}
